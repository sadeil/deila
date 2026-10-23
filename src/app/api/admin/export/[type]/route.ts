import { fail, handle } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { orderWhere, toCsv, type OrderFilters } from "@/lib/admin-queries";
import { db } from "@/lib/db";
import type { Permission } from "@/lib/rbac";

const money = (a: number) => (a / 100).toFixed(2);
const PERMS: Record<string, Permission> = {
  orders: "orders.view", commissions: "commissions.view", payments: "payments.view",
  customers: "customers.view", products: "products.view", inventory: "inventory.view", settlements: "commissions.view",
};

export const GET = handle(async (req: Request, ctx: { params: Promise<{ type: string }> }) => {
  const { type } = await ctx.params;
  const perm = PERMS[type];
  if (!perm) return fail("NOT_FOUND", 404);
  const admin = await requireAdmin(perm);
  const sp = Object.fromEntries(new URL(req.url).searchParams) as OrderFilters;
  const where = orderWhere(sp, admin.partnerId);
  let rows: (string | number | null)[][] = [];

  if (type === "orders") {
    const os = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, include: { commission: true, delivery: true } });
    rows = [["number", "created_at", "status", "payment_method", "payment_status", "customer", "phone", "email", "governorate", "city", "subtotal", "discount", "coupon", "shipping", "total", "commission", "commission_status", "tracking"],
      ...os.map((o) => [o.number, o.createdAt.toISOString(), o.status, o.paymentMethod, o.paymentStatus, o.fullName, o.phone, o.email, o.governorateName, o.cityName,
        money(o.subtotal), money(o.discount), o.couponCode, money(o.shippingFee), money(o.total), o.commission ? money(o.commission.amount) : "", o.commission?.status ?? "", o.delivery?.trackingRef ?? ""])];
  } else if (type === "commissions") {
    const cs = await db.commission.findMany({ where: { order: where }, orderBy: { createdAt: "desc" }, include: { order: true, partner: true, settlement: true } });
    rows = [["order", "order_date", "partner", "order_status", "payment_status", "base", "commission", "status", "void_reason", "settlement_ref"],
      ...cs.map((c) => [c.order.number, c.order.createdAt.toISOString(), c.partner.name, c.order.status, c.order.paymentStatus, money(c.baseAmount), money(c.amount), c.status, c.voidReason, c.settlement?.reference ?? ""])];
  } else if (type === "settlements") {
    const ss = await db.commissionSettlement.findMany({ orderBy: { createdAt: "desc" }, include: { partner: true, _count: { select: { commissions: true } } } });
    rows = [["created_at", "partner", "amount", "status", "reference", "paid_at", "commissions"], ...ss.map((s) => [s.createdAt.toISOString(), s.partner.name, money(s.amount), s.status, s.reference, s.paidAt?.toISOString() ?? "", s._count.commissions])];
  } else if (type === "payments") {
    const ps = await db.payment.findMany({ where: { order: where }, orderBy: { createdAt: "desc" }, include: { order: true, refunds: true } });
    rows = [["order", "date", "method", "provider", "status", "amount", "refunded", "provider_ref", "collected_by", "collected_at", "gateway_verified"],
      ...ps.map((p) => [p.order.number, p.createdAt.toISOString(), p.method, p.provider, p.status, money(p.amount), money(p.refunds.reduce((s, r) => s + (r.status === "COMPLETED" ? r.amount : 0), 0)), p.providerRef, p.collectedBy, p.collectedAt?.toISOString() ?? "", p.verifiedByProvider ? "yes" : "no"])];
  } else if (type === "customers") {
    const cs = await db.customer.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } });
    rows = [["name", "email", "phone", "status", "orders", "created_at"], ...cs.map((c) => [c.name, c.email, c.phone, c.status, c._count.orders, c.createdAt.toISOString()])];
  } else if (type === "products" || type === "inventory") {
    const vs = await db.productVariant.findMany({ where: admin.partnerId ? { product: { partnerId: admin.partnerId } } : {}, include: { product: { include: { category: true } }, inventory: true } });
    rows = [["product", "sku", "variant", "category", "status", "price", "price_verified", "demo", "availability", "inventory_verified", "tracked", "quantity", "partner_ref"],
      ...vs.map((v) => [v.product.nameEn, v.sku, v.nameEn, v.product.category.nameEn, v.product.status, money(v.price ?? v.product.price), v.product.priceVerified ? "yes" : "no", v.product.isDemo ? "yes" : "no",
        v.inventory?.availability ?? "", v.inventory?.verified ? "yes" : "no", v.inventory?.trackQuantity ? "yes" : "no", v.inventory?.trackQuantity ? v.inventory.quantity : "", v.inventory?.partnerRef ?? ""])];
  }

  await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: `export.${type}`, entity: "Export", data: { rows: rows.length - 1 } });
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="della-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
