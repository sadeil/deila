/**
 * Integration tests for the real order engine against a disposable copy of the seeded database
 * (prisma/test.db). They exercise checkout, inventory reservation, coupons, the state machine,
 * COD collection, commissions, refunds and signed payment webhooks end to end at the service layer.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quoteCart } from "@/lib/services/pricing";
import {
  applyPaymentResult, createOrder, OrderError, processRefund, recordCodPayment, transitionOrder, verifyOrderToken,
} from "@/lib/services/orders";
import { sandboxProvider } from "@/lib/services/payments/sandbox";
import { signPayload } from "@/lib/services/payments/hmac";
import type { CheckoutInput } from "@/lib/validation";

let variantId = "";
let tracked = "";
let served = "";
let unserved = "";
const admin = { type: "ADMIN" as const, id: "test-admin" };

const input = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: randomUUID(),
  items: [{ variantId, quantity: 1 }],
  couponCode: null,
  fullName: "Integration Test",
  phone: `059${Math.floor(1000000 + Math.random() * 8999999)}`,
  email: null,
  localityId: served,
  street: "Street",
  addressDetails: "Building",
  landmark: null,
  deliveryNotes: null,
  paymentMethod: "COD",
  locale: "en",
  ...over,
});

beforeAll(async () => {
  const v = await db.productVariant.findFirstOrThrow({ where: { product: { slug: "ipl-hair-removal-device" } } });
  variantId = v.id;
  const t = await db.productVariant.findFirstOrThrow({ where: { product: { slug: "mini-portable-printer" } }, include: { inventory: true } });
  tracked = t.id;
  await db.inventory.update({ where: { variantId: t.id }, data: { trackQuantity: true, quantity: 2, availability: "IN_STOCK", verified: true } });
  served = (await db.locality.findFirstOrThrow({ where: { nameEn: "Ramallah" } })).id;
  unserved = (await db.locality.findFirstOrThrow({ where: { nameEn: "Silwad" } })).id;
  await db.storeSetting.upsert({ where: { key: "payments" }, create: { key: "payments", value: { codEnabled: true, cardEnabled: true, merchantOfRecord: "PARTNER" } }, update: { value: { codEnabled: true, cardEnabled: true, merchantOfRecord: "PARTNER" } } });
});

describe("server-side pricing", () => {
  it("ignores client prices and computes shipping per zone", async () => {
    const q = await quoteCart({ items: [{ variantId, quantity: 2 }], localityId: served });
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { product: true } });
    expect(q.subtotal).toBe((v.price ?? v.product.price) * 2);
    expect(q.shipping?.serviceable).toBe(true);
    expect(q.total).toBe(q.subtotal + q.shipping!.fee);
  });
  it("applies free shipping above the zone threshold", async () => {
    const q = await quoteCart({ items: [{ variantId, quantity: 1 }], localityId: served }); // 599 ≥ 300 threshold
    expect(q.shipping?.freeShippingApplied).toBe(true);
    expect(q.shipping?.fee).toBe(0);
  });
  it("refuses unserviceable areas", async () => {
    const q = await quoteCart({ items: [{ variantId, quantity: 1 }], localityId: unserved });
    expect(q.errors).toContain("NOT_SERVICEABLE");
  });
});

describe("COD checkout → fulfilment → commission", () => {
  it("creates an order with pending confirmation, unpaid status and a valid access token", async () => {
    const res = await createOrder(input(), null);
    const o = await db.order.findUniqueOrThrow({ where: { id: res.orderId }, include: { commission: true, payments: true } });
    expect(o.status).toBe("PENDING_CONFIRMATION");
    expect(o.paymentStatus).toBe("UNPAID");
    expect(o.commission?.status).toBe("PENDING");
    expect(o.commission?.amount).toBeGreaterThan(0);
    expect(verifyOrderToken(o, res.token)).toBe(true);
    expect(verifyOrderToken(o, "x".repeat(32))).toBe(false);
  });

  it("is idempotent for the same key", async () => {
    const i = input();
    const a = await createOrder(i, null);
    const b = await createOrder(i, null);
    expect(b.orderId).toBe(a.orderId);
    expect(b.duplicate).toBe(true);
  });

  it("enforces transitions and earns commission only after delivery + collection", async () => {
    const { orderId } = await createOrder(input(), null);
    await expect(transitionOrder(orderId, "DELIVERED", admin)).rejects.toBeInstanceOf(OrderError);
    for (const s of ["CONFIRMED", "PREPARING", "SHIPPED"] as const) await transitionOrder(orderId, s, admin, { trackingRef: "TRK1" });
    await transitionOrder(orderId, "DELIVERED", admin);
    expect((await db.commission.findUniqueOrThrow({ where: { orderId } })).status).toBe("PENDING");
    await recordCodPayment(orderId, admin, "COURIER");
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { commission: true, delivery: true } });
    expect(o.paymentStatus).toBe("PAID");
    expect(o.commission?.status).toBe("APPROVED");
    expect(o.delivery?.trackingRef).toBe("TRK1");
    await expect(recordCodPayment(orderId, admin, "COURIER")).rejects.toBeInstanceOf(OrderError);
  });

  it("voids commission on a full refund and on cancellation", async () => {
    const a = await createOrder(input(), null);
    for (const s of ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"] as const) await transitionOrder(a.orderId, s, admin);
    await recordCodPayment(a.orderId, admin, "PARTNER");
    const total = (await db.order.findUniqueOrThrow({ where: { id: a.orderId } })).total;
    await processRefund(a.orderId, total, "Defective", admin);
    expect((await db.order.findUniqueOrThrow({ where: { id: a.orderId } })).paymentStatus).toBe("REFUNDED");
    expect((await db.commission.findUniqueOrThrow({ where: { orderId: a.orderId } })).status).toBe("VOID");
    await expect(processRefund(a.orderId, 100, "again", admin)).rejects.toBeInstanceOf(OrderError);

    const b = await createOrder(input(), null);
    await transitionOrder(b.orderId, "CANCELED", admin, { note: "Customer request" });
    expect((await db.commission.findUniqueOrThrow({ where: { orderId: b.orderId } })).status).toBe("VOID");
  });
});

describe("inventory", () => {
  it("reserves tracked stock, prevents overselling and restocks on cancel", async () => {
    const a = await createOrder(input({ items: [{ variantId: tracked, quantity: 2 }] }), null);
    const inv = await db.inventory.findUniqueOrThrow({ where: { variantId: tracked } });
    expect(inv.quantity).toBe(0);
    expect(inv.availability).toBe("OUT_OF_STOCK");
    await expect(createOrder(input({ items: [{ variantId: tracked, quantity: 1 }] }), null)).rejects.toBeInstanceOf(OrderError);
    await transitionOrder(a.orderId, "CANCELED", admin, { note: "test" });
    const after = await db.inventory.findUniqueOrThrow({ where: { variantId: tracked } });
    expect(after.quantity).toBe(2);
    expect(after.availability).toBe("IN_STOCK");
  });
});

describe("coupons", () => {
  it("enforces the per-customer limit by phone and releases usage on cancel", async () => {
    const phone = "0598765432";
    const a = await createOrder(input({ phone, couponCode: "WELCOME10" }), null);
    expect((await db.order.findUniqueOrThrow({ where: { id: a.orderId } })).discount).toBeGreaterThan(0);
    await expect(createOrder(input({ phone, couponCode: "WELCOME10" }), null)).rejects.toMatchObject({ code: "COUPON_INVALID" });
    await transitionOrder(a.orderId, "CANCELED", admin, { note: "release" });
    const again = await createOrder(input({ phone, couponCode: "WELCOME10" }), null);
    expect(again.orderId).toBeTruthy();
  });
});

describe("card payments (sandbox provider)", () => {
  it("only becomes PAID through a verified webhook, and blocks confirmation before payment", async () => {
    process.env.PAYMENT_PROVIDER = "sandbox";
    const res = await createOrder(input({ paymentMethod: "CARD" }), null);
    expect(res.redirectUrl).toContain("/pay/sandbox");
    const p = await db.payment.findFirstOrThrow({ where: { orderId: res.orderId } });
    expect(p.status).toBe("PENDING");
    await expect(transitionOrder(res.orderId, "CONFIRMED", admin)).rejects.toMatchObject({ code: "CARD_NOT_PAID" });

    const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: "payment.updated", data: { ref: p.providerRef, status: "PAID", amount: p.amount, currency: "ILS" } });
    const bad = await sandboxProvider.verifyWebhook(body, new Headers({ "x-sandbox-signature": signPayload("wrong-secret", body) }));
    expect(bad).toBeNull();
    const ev = await sandboxProvider.verifyWebhook(body, new Headers({ "x-sandbox-signature": signPayload(process.env.SANDBOX_WEBHOOK_SECRET!, body) }));
    expect(ev?.status).toBe("PAID");

    expect(await applyPaymentResult(res.orderId, "PAID", { type: "PROVIDER", id: "sandbox" })).toBe(true);
    expect(await applyPaymentResult(res.orderId, "PAID", { type: "PROVIDER", id: "sandbox" })).toBe(false); // idempotent
    const paid = await db.payment.findUniqueOrThrow({ where: { id: p.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.verifiedByProvider).toBe(true);
    await transitionOrder(res.orderId, "CONFIRMED", admin);
  });
});
