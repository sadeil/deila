import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { getSettings } from "../settings";
import { formatMoney } from "../money";
import { siteUrl } from "../utils";
import type { CheckoutInput } from "../validation";
import { quoteCart, type Quote } from "./pricing";
import { commissionAfterRefund, lineCommission, resolveCommissionRule } from "./commission";
import { notifyAdmins, notifyCustomer } from "./notifications";
import { getProvider } from "./payments";

type Tx = Prisma.TransactionClient;
export type Actor = { type: "ADMIN" | "SYSTEM" | "CUSTOMER" | "PROVIDER"; id?: string | null; name?: string | null; partnerId?: string | null };

export class OrderError extends Error {
  constructor(public code: string, public quote?: Quote) { super(code); }
}

// ───────────── Order access tokens ─────────────

/** Deterministic per-order secret, so idempotent retries can return the same link. */
export function orderAccessToken(orderId: string) {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(`order:${orderId}`).digest("base64url").slice(0, 32);
}
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function verifyOrderToken(order: { accessTokenHash: string }, token: string | null | undefined) {
  if (!token) return false;
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(order.accessTokenHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function newOrderNumber(tx: Tx) {
  const yy = String(new Date().getFullYear()).slice(2);
  for (let i = 0; i < 8; i++) {
    const n = `DL${yy}${randomInt(100000, 999999)}`;
    if (!(await tx.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  throw new OrderError("NUMBER_GENERATION_FAILED");
}

// ───────────── Checkout ─────────────

export async function createOrder(input: CheckoutInput, customerId: string | null) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return { orderId: existing.id, number: existing.number, token: orderAccessToken(existing.id), redirectUrl: null as string | null, duplicate: true };
  }

  const settings = await getSettings();
  const provider = input.paymentMethod === "CARD" ? getProvider() : null;
  if (input.paymentMethod === "CARD" && (!settings.payments.cardEnabled || !provider)) throw new OrderError("CARD_NOT_AVAILABLE");
  if (input.paymentMethod === "COD" && !settings.payments.codEnabled) throw new OrderError("COD_NOT_AVAILABLE");

  const lowStock: string[] = [];

  const order = await db.$transaction(async (tx) => {
    const quote = await quoteCart(
      { items: input.items, couponCode: input.couponCode, localityId: input.localityId, phone: input.phone, maxQtyPerItem: settings.catalog.maxQtyPerItem },
      tx,
    );
    // Any adjustment means the customer would pay something different from what they reviewed.
    const requested = new Map(input.items.map((i) => [i.variantId, i.quantity]));
    const changed = quote.lines.some((l) => l.issue || l.quantity !== requested.get(l.variantId));
    if (quote.errors.length || changed) throw new OrderError(quote.errors[0] ?? "CART_CHANGED", quote);
    if (input.couponCode && !quote.coupon?.valid) throw new OrderError("COUPON_INVALID", quote);
    if (!quote.shipping?.serviceable) throw new OrderError("NOT_SERVICEABLE", quote);
    if (input.paymentMethod === "COD" && !quote.shipping.codAvailable) throw new OrderError("COD_NOT_AVAILABLE_AREA", quote);

    // Reserve stock atomically — the conditional update fails rather than overselling.
    const inventories = await tx.inventory.findMany({ where: { variantId: { in: quote.lines.map((l) => l.variantId) } } });
    const stockMoves: { inventoryId: string; delta: number; after: number }[] = [];
    for (const line of quote.lines) {
      const inv = inventories.find((i) => i.variantId === line.variantId);
      if (!inv?.trackQuantity) continue;
      const res = await tx.inventory.updateMany({
        where: { id: inv.id, quantity: { gte: line.quantity } },
        data: { quantity: { decrement: line.quantity } },
      });
      if (res.count !== 1) throw new OrderError("OUT_OF_STOCK", quote);
      const after = inv.quantity - line.quantity;
      if (after <= 0) await tx.inventory.update({ where: { id: inv.id }, data: { availability: "OUT_OF_STOCK" } });
      if (after <= inv.lowStockThreshold) lowStock.push(line.sku);
      stockMoves.push({ inventoryId: inv.id, delta: -line.quantity, after });
    }

    // Coupon usage — re-checked inside the transaction.
    let couponId: string | null = null;
    if (quote.coupon?.valid) {
      const c = await tx.coupon.findUniqueOrThrow({ where: { code: quote.coupon.code } });
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new OrderError("COUPON_INVALID", quote);
      await tx.coupon.update({ where: { id: c.id }, data: { usedCount: { increment: 1 } } });
      couponId = c.id;
    }

    // Commission per line using product → partner → default rule priority.
    const products = await tx.product.findMany({
      where: { id: { in: quote.lines.map((l) => l.productId) } },
      include: { partner: true },
    });
    const partnerId = products[0].partnerId;
    const commissionDefaults = settings.commission;
    const items = quote.lines.map((l, i) => {
      const p = products.find((x) => x.id === l.productId)!;
      const rule = resolveCommissionRule(p, p.partner, commissionDefaults);
      const net = l.lineTotal - quote.discountShares[i];
      return {
        productId: l.productId, variantId: l.variantId,
        nameAr: l.nameAr, nameEn: l.nameEn, variantNameAr: l.variantNameAr, variantNameEn: l.variantNameEn,
        sku: l.sku, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.lineTotal,
        discountShare: quote.discountShares[i],
        commissionAmount: lineCommission(rule, net, l.quantity),
      };
    });
    const commissionTotal = items.reduce((s, i) => s + i.commissionAmount, 0);

    const loc = await tx.locality.findUniqueOrThrow({ where: { id: input.localityId }, include: { governorate: true } });
    const number = await newOrderNumber(tx);

    const created = await tx.order.create({
      data: {
        number,
        accessTokenHash: "pending",
        idempotencyKey: input.idempotencyKey,
        customerId,
        partnerId,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "CARD" ? "PENDING" : "UNPAID",
        fullName: input.fullName, phone: input.phone, email: input.email,
        localityId: loc.id,
        governorateName: input.locale === "ar" ? loc.governorate.nameAr : loc.governorate.nameEn,
        cityName: input.locale === "ar" ? loc.nameAr : loc.nameEn,
        street: input.street, addressDetails: input.addressDetails, landmark: input.landmark, deliveryNotes: input.deliveryNotes,
        subtotal: quote.subtotal, discount: quote.discount, shippingFee: quote.shipping.fee, total: quote.total,
        couponCode: quote.coupon?.valid ? quote.coupon.code : null,
        locale: input.locale,
        items: { create: items },
        history: { create: { kind: "STATUS", toValue: "PENDING_CONFIRMATION", actorType: customerId ? "CUSTOMER" : "SYSTEM", actorId: customerId } },
        payments: {
          create: {
            method: input.paymentMethod,
            provider: input.paymentMethod === "COD" ? "cod" : provider!.key,
            status: input.paymentMethod === "COD" ? "UNPAID" : "PENDING",
            amount: quote.total,
          },
        },
        delivery: { create: {} },
        commission: {
          create: { partnerId, baseAmount: quote.subtotal - quote.discount, amount: commissionTotal, status: "PENDING" },
        },
      },
    });
    await tx.order.update({ where: { id: created.id }, data: { accessTokenHash: sha256(orderAccessToken(created.id)) } });
    if (couponId) await tx.couponRedemption.create({ data: { couponId, orderId: created.id, phone: input.phone } });
    for (const m of stockMoves) {
      await tx.stockAdjustment.create({
        data: { inventoryId: m.inventoryId, delta: m.delta, quantityAfter: m.after, reason: "ORDER", orderId: created.id },
      });
    }
    if (customerId && input.saveAddress) {
      const has = await tx.customerAddress.count({ where: { customerId } });
      await tx.customerAddress.create({
        data: {
          customerId, fullName: input.fullName, phone: input.phone, localityId: loc.id,
          street: input.street, details: input.addressDetails, landmark: input.landmark, isDefault: has === 0,
        },
      });
    }
    return created;
  });

  const token = orderAccessToken(order.id);
  let redirectUrl: string | null = null;
  if (input.paymentMethod === "CARD" && provider) {
    try {
      const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id } });
      const res = await provider.createCheckout({
        orderId: order.id, orderNumber: order.number, amount: order.total, currency: order.currency,
        returnUrl: siteUrl(`/order/${order.number}?t=${token}`),
        cancelUrl: siteUrl(`/order/${order.number}?t=${token}`),
        customer: { name: order.fullName, phone: order.phone, email: order.email },
        idempotencyKey: `pay_${order.id}`,
      });
      await db.payment.update({ where: { id: payment.id }, data: { providerRef: res.providerRef } });
      redirectUrl = res.redirectUrl;
    } catch (e) {
      await applyPaymentResult(order.id, "FAILED", { type: "SYSTEM" }, `Initiation failed: ${String(e).slice(0, 200)}`);
    }
  }

  await notifyAdmins("NEW_ORDER", `New order ${order.number}`, `${order.fullName} · ${formatMoney(order.total, "en")} · ${order.paymentMethod}`, order.id);
  await notifyCustomer(
    "NEW_ORDER", { email: order.email, phone: order.phone },
    order.locale === "ar" ? `تم استلام طلبك ${order.number}` : `We received your order ${order.number}`,
    order.locale === "ar" ? `سنتواصل معك لتأكيد الطلب. تتبعي طلبك: ${siteUrl(`/order/${order.number}?t=${token}`)}` : `We'll contact you to confirm. Track it: ${siteUrl(`/order/${order.number}?t=${token}`)}`,
    order.id,
  );
  if (lowStock.length && (await getSettings()).notifications.lowStockAlerts) {
    await notifyAdmins("LOW_STOCK", "Low stock", `SKU: ${lowStock.join(", ")}`);
  }
  return { orderId: order.id, number: order.number, token, redirectUrl, duplicate: false };
}

// ───────────── Fulfilment state machine ─────────────

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["SHIPPED", "CANCELED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELED: [],
  RETURNED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: Actor,
  opts: { note?: string; trackingRef?: string; courierId?: string; restock?: boolean } = {},
) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { commission: true } });
    if (actor.partnerId && order.partnerId !== actor.partnerId) throw new OrderError("FORBIDDEN");
    if (!canTransition(order.status, to)) throw new OrderError("INVALID_TRANSITION");
    if (to === "CONFIRMED" && order.paymentMethod === "CARD" && order.paymentStatus !== "PAID") throw new OrderError("CARD_NOT_PAID");

    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderStatusHistory.create({
      data: { orderId, kind: "STATUS", fromValue: order.status, toValue: to, note: opts.note, actorType: actor.type, actorId: actor.id },
    });

    const now = new Date();
    if (to === "SHIPPED" || to === "OUT_FOR_DELIVERY" || opts.trackingRef || opts.courierId) {
      await tx.delivery.update({
        where: { orderId },
        data: {
          ...(to === "SHIPPED" ? { shippedAt: now } : {}),
          ...(opts.trackingRef ? { trackingRef: opts.trackingRef } : {}),
          ...(opts.courierId ? { courierId: opts.courierId } : {}),
        },
      });
    }
    if (to === "DELIVERED") {
      await tx.delivery.update({ where: { orderId }, data: { deliveredAt: now } });
      await maybeApproveCommission(tx, orderId);
    }
    if (to === "CANCELED" || to === "RETURNED") {
      if (to === "CANCELED" || opts.restock !== false) await restockOrder(tx, orderId, to === "CANCELED" ? "CANCEL_RESTOCK" : "RETURN_RESTOCK", actor.id);
      await voidCommission(tx, orderId, to);
      if (to === "CANCELED" && order.couponCode) {
        const red = await tx.couponRedemption.findUnique({ where: { orderId } });
        if (red) {
          await tx.couponRedemption.delete({ where: { id: red.id } });
          await tx.coupon.update({ where: { id: red.couponId }, data: { usedCount: { decrement: 1 } } });
        }
      }
    }
    return order;
  });

  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const ar = o.locale === "ar";
  const msgs: Partial<Record<OrderStatus, [Parameters<typeof notifyCustomer>[0], string, string]>> = {
    CONFIRMED: ["ORDER_CONFIRMED", ar ? `تم تأكيد طلبك ${o.number}` : `Order ${o.number} confirmed`, ar ? "نحضّر طلبك الآن." : "We're preparing your order."],
    SHIPPED: ["ORDER_SHIPPED", ar ? `طلبك ${o.number} في الطريق` : `Order ${o.number} shipped`, opts.trackingRef ? `Tracking: ${opts.trackingRef}` : ""],
    DELIVERED: ["ORDER_DELIVERED", ar ? `تم توصيل طلبك ${o.number}` : `Order ${o.number} delivered`, ar ? "شكراً لتسوقك مع ديلا." : "Thank you for shopping with DELLA."],
    CANCELED: ["ORDER_CANCELED", ar ? `تم إلغاء طلبك ${o.number}` : `Order ${o.number} canceled`, opts.note ?? ""],
  };
  const m = msgs[to];
  if (m) await notifyCustomer(m[0], { email: o.email, phone: o.phone }, m[1], m[2], o.id);
  return result;
}

async function restockOrder(tx: Tx, orderId: string, reason: string, actorId?: string | null) {
  const moves = await tx.stockAdjustment.findMany({ where: { orderId } });
  const net = new Map<string, number>();
  for (const m of moves) net.set(m.inventoryId, (net.get(m.inventoryId) ?? 0) + m.delta);
  for (const [inventoryId, delta] of net) {
    if (delta >= 0) continue; // already restocked
    const inv = await tx.inventory.update({
      where: { id: inventoryId },
      data: { quantity: { increment: -delta } },
    });
    if (inv.quantity > 0 && inv.availability === "OUT_OF_STOCK") {
      await tx.inventory.update({ where: { id: inventoryId }, data: { availability: "IN_STOCK" } });
    }
    await tx.stockAdjustment.create({
      data: { inventoryId, delta: -delta, quantityAfter: inv.quantity, reason, orderId, actorId: actorId ?? null },
    });
  }
}

/** Commission is earned only once the order is delivered AND payment has been collected. */
async function maybeApproveCommission(tx: Tx, orderId: string) {
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { commission: true } });
  if (o.status === "DELIVERED" && (o.paymentStatus === "PAID" || o.paymentStatus === "PARTIALLY_REFUNDED") && o.commission?.status === "PENDING") {
    await tx.commission.update({ where: { orderId }, data: { status: "APPROVED", approvedAt: new Date() } });
  }
}

async function voidCommission(tx: Tx, orderId: string, reason: string) {
  const c = await tx.commission.findUnique({ where: { orderId } });
  if (!c || c.status === "VOID") return;
  // If already settled (PAID) the reversal is tracked as a clawback (voidReason + settlementId kept).
  await tx.commission.update({
    where: { orderId },
    data: { status: "VOID", voidReason: c.status === "PAID" ? `CLAWBACK_${reason}` : reason },
  });
}

// ───────────── Payments ─────────────

/** COD collection is recorded by staff. Card payments can only be confirmed by a verified provider webhook. */
export async function recordCodPayment(orderId: string, actor: Actor, collectedBy: "PARTNER" | "DELLA" | "COURIER") {
  await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (actor.partnerId && o.partnerId !== actor.partnerId) throw new OrderError("FORBIDDEN");
    if (o.paymentMethod !== "COD") throw new OrderError("NOT_COD");
    if (o.paymentStatus !== "UNPAID") throw new OrderError("ALREADY_RECORDED");
    if (o.status === "CANCELED" || o.status === "PENDING_CONFIRMATION") throw new OrderError("INVALID_STATE");
    const p = await tx.payment.findFirstOrThrow({ where: { orderId, method: "COD" } });
    await tx.payment.update({ where: { id: p.id }, data: { status: "PAID", collectedBy, collectedAt: new Date(), amount: o.total } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
    await tx.orderStatusHistory.create({
      data: { orderId, kind: "PAYMENT", fromValue: "UNPAID", toValue: "PAID", note: `COD collected by ${collectedBy}`, actorType: actor.type, actorId: actor.id },
    });
    await maybeApproveCommission(tx, orderId);
  });
}

/** Applied from a verified provider webhook (or on initiation failure). Idempotent. */
export async function applyPaymentResult(orderId: string, status: "PAID" | "FAILED", actor: Actor, note?: string) {
  const changed = await db.$transaction(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (o.paymentStatus === status || o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED") return false;
    const p = await tx.payment.findFirst({ where: { orderId, method: "CARD" }, orderBy: { createdAt: "desc" } });
    if (p) await tx.payment.update({ where: { id: p.id }, data: { status, verifiedByProvider: actor.type === "PROVIDER" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    await tx.orderStatusHistory.create({
      data: { orderId, kind: "PAYMENT", fromValue: o.paymentStatus, toValue: status, note, actorType: actor.type, actorId: actor.id },
    });
    if (status === "PAID") await maybeApproveCommission(tx, orderId);
    return true;
  });
  if (changed) {
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    const ar = o.locale === "ar";
    if (status === "PAID") {
      await notifyAdmins("PAYMENT_CONFIRMED", `Payment confirmed ${o.number}`, formatMoney(o.total, "en"), o.id);
      await notifyCustomer("PAYMENT_CONFIRMED", { email: o.email, phone: o.phone }, ar ? `تم استلام الدفع للطلب ${o.number}` : `Payment received for ${o.number}`, "", o.id);
    } else {
      await notifyAdmins("PAYMENT_FAILED", `Payment failed ${o.number}`, note ?? "", o.id);
      await notifyCustomer("PAYMENT_FAILED", { email: o.email, phone: o.phone }, ar ? `لم يكتمل الدفع للطلب ${o.number}` : `Payment failed for ${o.number}`, "", o.id);
    }
  }
  return changed;
}

/**
 * Refunds. Card refunds go through the provider API; COD refunds record cash returned.
 * Commission is reduced proportionally (or voided on full refund).
 */
export async function processRefund(orderId: string, amount: number, reason: string, actor: Actor) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true, refunds: true } });
  const paid = order.payments.find((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");
  if (!paid) throw new OrderError("NOTHING_TO_REFUND");
  const refunded = order.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r.amount, 0);
  if (amount <= 0 || amount > order.total - refunded) throw new OrderError("INVALID_AMOUNT");

  let providerRef: string | null = null;
  if (paid.method === "CARD") {
    const provider = getProvider(paid.provider);
    if (!provider || !paid.providerRef) throw new OrderError("PROVIDER_NOT_CONFIGURED");
    const r = await provider.refund({ providerRef: paid.providerRef, amount, idempotencyKey: `rf_${orderId}_${refunded + amount}` });
    providerRef = r.refundRef;
  }

  await db.$transaction(async (tx) => {
    await tx.refund.create({
      data: { orderId, paymentId: paid.id, amount, reason, status: "COMPLETED", providerRef, createdById: actor.id ?? "system" },
    });
    const totalRefunded = refunded + amount;
    const full = totalRefunded >= order.total;
    const ps = full ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await tx.payment.update({ where: { id: paid.id }, data: { status: ps } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: ps } });
    await tx.orderStatusHistory.create({
      data: { orderId, kind: "PAYMENT", fromValue: order.paymentStatus, toValue: ps, note: `${formatMoney(amount, "en")} · ${reason}`, actorType: actor.type, actorId: actor.id },
    });
    const c = await tx.commission.findUnique({ where: { orderId } });
    if (c && c.status !== "VOID") {
      if (full) await voidCommission(tx, orderId, "REFUNDED");
      else {
        const merchRefunded = Math.min(totalRefunded, c.baseAmount);
        const base = order.subtotal - order.discount;
        const original = await tx.orderItem.aggregate({ where: { orderId }, _sum: { commissionAmount: true } });
        await tx.commission.update({
          where: { orderId },
          data: { amount: commissionAfterRefund(original._sum.commissionAmount ?? 0, base, merchRefunded) },
        });
      }
    }
  });
  await notifyAdmins("REFUND_PROCESSED", `Refund ${order.number}`, formatMoney(amount, "en"), orderId);
  await notifyCustomer("REFUND_PROCESSED", { email: order.email, phone: order.phone },
    order.locale === "ar" ? `تمت معالجة استرداد للطلب ${order.number}` : `Refund processed for ${order.number}`, formatMoney(amount, order.locale as "ar" | "en"), orderId);
}
