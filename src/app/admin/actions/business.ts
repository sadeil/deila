"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, bool, fd, type ActionResult } from "@/lib/admin-action";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

const shekels = z.string().trim().optional().transform((v) => (v ? Math.round(Number(v) * 100) : null)).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "INVALID_AMOUNT");
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const dateOpt = z.string().optional().transform((v) => (v ? new Date(v) : null)).refine((d) => d === null || !isNaN(+d), "INVALID");

// ───────── Commissions ─────────

/** Bundle all earned (APPROVED, unsettled) commissions for a partner into a settlement draft. */
export async function createSettlement(_: ActionResult, form: FormData) {
  return adminAction("commissions.manage", async (admin) => {
    const partnerId = z.string().min(1).parse(form.get("partnerId"));
    const s = await db.$transaction(async (tx) => {
      const due = await tx.commission.findMany({ where: { partnerId, status: "APPROVED", settlementId: null } });
      if (!due.length) return null;
      const amount = due.reduce((a, c) => a + c.amount, 0);
      const settlement = await tx.commissionSettlement.create({ data: { partnerId, amount, createdById: admin.id, notes: opt(500).parse(form.get("notes") ?? undefined) } });
      await tx.commission.updateMany({ where: { id: { in: due.map((d) => d.id) } }, data: { settlementId: settlement.id } });
      return settlement;
    });
    if (!s) return { error: "NOTHING_TO_SETTLE" };
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "settlement.create", entity: "CommissionSettlement", entityId: s.id, data: { amount: s.amount } });
    revalidatePath("/admin/commissions");
  });
}

export async function markSettlementPaid(_: ActionResult, form: FormData) {
  return adminAction("commissions.manage", async (admin) => {
    const v = z.object({ id: z.string().min(1), reference: z.string().trim().min(1).max(120) }).parse(fd(form));
    await db.$transaction(async (tx) => {
      const s = await tx.commissionSettlement.findUniqueOrThrow({ where: { id: v.id } });
      if (s.status === "PAID") return;
      await tx.commissionSettlement.update({ where: { id: v.id }, data: { status: "PAID", paidAt: new Date(), reference: v.reference } });
      // Only commissions still APPROVED are marked paid (any voided since the draft stay void).
      await tx.commission.updateMany({ where: { settlementId: v.id, status: "APPROVED" }, data: { status: "PAID" } });
    });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "settlement.paid", entity: "CommissionSettlement", entityId: v.id, data: { reference: v.reference } });
    revalidatePath("/admin/commissions");
  });
}

export async function cancelSettlement(_: ActionResult, form: FormData) {
  return adminAction("commissions.manage", async (admin) => {
    const id = String(form.get("id"));
    await db.$transaction(async (tx) => {
      const s = await tx.commissionSettlement.findUniqueOrThrow({ where: { id } });
      if (s.status === "PAID") throw new Error("PAID_SETTLEMENT");
      await tx.commission.updateMany({ where: { settlementId: id }, data: { settlementId: null } });
      await tx.commissionSettlement.delete({ where: { id } });
    });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "settlement.cancel", entity: "CommissionSettlement", entityId: id });
    revalidatePath("/admin/commissions");
  });
}

export async function voidCommissionManually(_: ActionResult, form: FormData) {
  return adminAction("commissions.manage", async (admin) => {
    const v = z.object({ id: z.string().min(1), reason: z.string().trim().min(3).max(200) }).parse(fd(form));
    const c = await db.commission.findUniqueOrThrow({ where: { id: v.id } });
    if (c.status === "PAID" || c.status === "VOID") return { error: "INVALID_STATE" };
    await db.commission.update({ where: { id: v.id }, data: { status: "VOID", voidReason: `MANUAL: ${v.reason}`, settlementId: null } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "commission.void", entity: "Commission", entityId: v.id, data: { reason: v.reason } });
    revalidatePath("/admin/commissions");
  });
}

// ───────── Partners ─────────

export async function savePartner(_: ActionResult, form: FormData) {
  return adminAction("partners.manage", async (admin) => {
    const v = z.object({
      id: z.string().optional(), name: z.string().trim().min(2).max(120), contactName: opt(80), phone: opt(30), email: opt(120), address: opt(200), notes: opt(1000),
      commissionType: z.enum(["PERCENT", "FIXED"]), commissionValue: z.coerce.number().min(0).max(100000),
    }).parse(fd(form));
    if (v.commissionType === "PERCENT" && v.commissionValue > 100) return { error: "VALIDATION", fields: { commissionValue: "INVALID_AMOUNT" } };
    const data = {
      name: v.name, contactName: v.contactName, phone: v.phone, email: v.email, address: v.address, notes: v.notes,
      commissionType: v.commissionType, commissionValue: Math.round(v.commissionValue * 100),
      fulfillmentByPartner: bool(form.get("fulfillmentByPartner")), deliveryByPartner: bool(form.get("deliveryByPartner")),
      warrantyByPartner: bool(form.get("warrantyByPartner")), collectsPayment: bool(form.get("collectsPayment")), active: bool(form.get("active")),
    };
    const p = v.id ? await db.partner.update({ where: { id: v.id }, data }) : await db.partner.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "partner.save", entity: "Partner", entityId: p.id, data: { commissionType: data.commissionType, commissionValue: data.commissionValue } });
    revalidatePath("/admin/partners");
  });
}

// ───────── Coupons ─────────

export async function saveCoupon(_: ActionResult, form: FormData) {
  return adminAction("promotions.manage", async (admin) => {
    const v = z.object({
      id: z.string().optional(),
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "INVALID_CODE"),
      type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
      value: z.coerce.number().min(0).max(100000),
      startsAt: dateOpt, endsAt: dateOpt, minOrder: shekels,
      usageLimit: z.string().optional().transform((x) => (x ? parseInt(x, 10) : null)),
      perCustomerLimit: z.string().optional().transform((x) => (x ? parseInt(x, 10) : null)),
    }).parse(fd(form));
    if (v.type === "PERCENT" && (v.value <= 0 || v.value > 90)) return { error: "VALIDATION", fields: { value: "INVALID_AMOUNT" } };
    const productIds = form.getAll("productIds").map(String).filter(Boolean);
    const categoryIds = form.getAll("categoryIds").map(String).filter(Boolean);
    const data = {
      code: v.code, type: v.type, value: v.type === "FIXED" ? Math.round(v.value * 100) : v.type === "PERCENT" ? Math.round(v.value) : 0,
      startsAt: v.startsAt, endsAt: v.endsAt, minOrder: v.minOrder, usageLimit: v.usageLimit, perCustomerLimit: v.perCustomerLimit,
      productIds, categoryIds, excludeSaleItems: bool(form.get("excludeSaleItems")), active: bool(form.get("active")),
    };
    const c = v.id ? await db.coupon.update({ where: { id: v.id }, data }) : await db.coupon.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "coupon.save", entity: "Coupon", entityId: c.id, data: { code: c.code } });
    revalidatePath("/admin/coupons");
  });
}

// ───────── Delivery ─────────

export async function saveZone(_: ActionResult, form: FormData) {
  return adminAction("delivery.manage", async (admin) => {
    const v = z.object({
      id: z.string().optional(), nameAr: z.string().trim().min(2).max(80), nameEn: z.string().trim().min(2).max(80),
      fee: z.string().transform((x) => Math.round(Number(x) * 100)).refine((x) => Number.isFinite(x) && x >= 0), freeShippingMin: shekels,
      etaMinDays: z.coerce.number().int().min(0).max(60), etaMaxDays: z.coerce.number().int().min(0).max(60),
      sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    }).parse(fd(form));
    if (v.etaMaxDays < v.etaMinDays) return { error: "VALIDATION", fields: { etaMaxDays: "INVALID" } };
    const data = { ...v, id: undefined, codAvailable: bool(form.get("codAvailable")), active: bool(form.get("active")) };
    const zRow = v.id ? await db.deliveryZone.update({ where: { id: v.id }, data }) : await db.deliveryZone.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "zone.save", entity: "DeliveryZone", entityId: zRow.id, data: { fee: data.fee, active: data.active } });
    revalidatePath("/admin/delivery");
  });
}

export async function updateLocality(_: ActionResult, form: FormData) {
  return adminAction("delivery.manage", async (admin) => {
    const v = z.object({ id: z.string().min(1), zoneId: z.string().optional() }).parse(fd(form));
    await db.locality.update({ where: { id: v.id }, data: { zoneId: v.zoneId || null, active: bool(form.get("active")), codAvailable: bool(form.get("codAvailable")) } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "locality.update", entity: "Locality", entityId: v.id });
    revalidatePath("/admin/delivery");
  });
}

export async function addLocality(_: ActionResult, form: FormData) {
  return adminAction("delivery.manage", async (admin) => {
    const v = z.object({ governorateId: z.string().min(1), nameAr: z.string().trim().min(2).max(80), nameEn: z.string().trim().min(2).max(80), zoneId: z.string().optional() }).parse(fd(form));
    const loc = await db.locality.create({ data: { ...v, zoneId: v.zoneId || null, active: bool(form.get("active")) } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "locality.create", entity: "Locality", entityId: loc.id });
    revalidatePath("/admin/delivery");
  });
}

export async function toggleGovernorate(_: ActionResult, form: FormData) {
  return adminAction("delivery.manage", async (admin) => {
    const id = String(form.get("id"));
    const active = form.get("active") === "1";
    await db.governorate.update({ where: { id }, data: { active } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "governorate.toggle", entity: "Governorate", entityId: id, data: { active } });
    revalidatePath("/admin/delivery");
  });
}

export async function saveCourier(_: ActionResult, form: FormData) {
  return adminAction("delivery.manage", async (admin) => {
    const v = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), phone: opt(30) }).parse(fd(form));
    const data = { name: v.name, phone: v.phone, active: bool(form.get("active")) };
    const c = v.id ? await db.courier.update({ where: { id: v.id }, data }) : await db.courier.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "courier.save", entity: "Courier", entityId: c.id });
    revalidatePath("/admin/delivery");
  });
}
