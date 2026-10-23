import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";

export type Range = { from: Date; to: Date; fromStr: string; toStr: string };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function parseRange(sp: { from?: string; to?: string }, defaultDays = 30): Range {
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);
  const now = new Date();
  const to = valid(sp.to) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = valid(sp.from) ?? new Date(to.getTime() - (defaultDays - 1) * 86400_000);
  const toEnd = new Date(to.getTime() + 86400_000 - 1);
  return { from, to: toEnd, fromStr: ymd(from), toStr: ymd(to) };
}

const ACTIVE: Prisma.EnumOrderStatusFilter = { notIn: ["CANCELED", "RETURNED"] };
const CONFIRMED_STATES = ["CONFIRMED", "PREPARING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

/** All figures are computed from live records. Gross ≠ collected ≠ commission; they are reported separately. */
export async function overview(range: Range, partnerId?: string | null) {
  const scope: Prisma.OrderWhereInput = { createdAt: { gte: range.from, lte: range.to }, ...(partnerId ? { partnerId } : {}) };

  const [byStatus, gross, confirmed, collected, refunds, commissions, methods, locations, recent] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: scope, _count: true }),
    db.order.aggregate({ where: { ...scope, status: ACTIVE }, _sum: { total: true }, _count: true }),
    db.order.aggregate({ where: { ...scope, status: { in: [...CONFIRMED_STATES] } }, _sum: { total: true } }),
    db.payment.aggregate({ where: { order: scope, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amount: true } }),
    db.refund.aggregate({ where: { order: scope, status: "COMPLETED" }, _sum: { amount: true } }),
    db.commission.groupBy({ by: ["status"], where: { order: scope }, _sum: { amount: true } }),
    db.order.groupBy({ by: ["paymentMethod"], where: { ...scope, status: ACTIVE }, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["governorateName"], where: { ...scope, status: ACTIVE }, _count: true, _sum: { total: true }, orderBy: { _count: { governorateName: "desc" } }, take: 8 }),
    db.order.findMany({ where: partnerId ? { partnerId } : {}, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const count = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;
  const totalOrders = byStatus.reduce((a, b) => a + b._count, 0);
  const comm = (s: string) => commissions.find((c) => c.status === s)?._sum.amount ?? 0;

  // Daily series (gross value of non-canceled orders + order count)
  const orders = await db.order.findMany({ where: scope, select: { createdAt: true, total: true, status: true } });
  const days: { date: string; gross: number; orders: number }[] = [];
  for (let d = new Date(range.from); d <= range.to; d = new Date(d.getTime() + 86400_000)) days.push({ date: ymd(d), gross: 0, orders: 0 });
  for (const o of orders) {
    const row = days.find((x) => x.date === ymd(o.createdAt));
    if (!row) continue;
    row.orders++;
    if (o.status !== "CANCELED" && o.status !== "RETURNED") row.gross += o.total;
  }

  const items = await db.orderItem.groupBy({
    by: ["productId", "nameAr", "nameEn"],
    where: { order: { ...scope, status: ACTIVE } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const lowStock = await db.inventory.findMany({
    where: {
      OR: [{ availability: "OUT_OF_STOCK" }, { trackQuantity: true, quantity: { lte: 3 } }],
      variant: { product: { status: { not: "ARCHIVED" }, ...(partnerId ? { partnerId } : {}) } },
    },
    include: { variant: { include: { product: { select: { nameAr: true, nameEn: true, id: true } } } } },
    take: 8,
  });

  return {
    totalOrders,
    grossValue: gross._sum.total ?? 0,
    activeOrders: gross._count,
    confirmedRevenue: confirmed._sum.total ?? 0,
    collected: collected._sum.amount ?? 0,
    refunded: refunds._sum.amount ?? 0,
    pending: count("PENDING_CONFIRMATION"),
    delivered: count("DELIVERED"),
    canceled: count("CANCELED") + count("RETURNED"),
    aov: gross._count ? Math.round((gross._sum.total ?? 0) / gross._count) : 0,
    commission: { pending: comm("PENDING"), earned: comm("APPROVED"), paid: comm("PAID") },
    series: days,
    methods: methods.map((m) => ({ method: m.paymentMethod, count: m._count, total: m._sum.total ?? 0 })),
    locations: locations.map((x) => ({ name: x.governorateName, count: x._count, total: x._sum.total ?? 0 })),
    bestSellers: items.map((i) => ({ productId: i.productId, nameAr: i.nameAr, nameEn: i.nameEn, qty: i._sum.quantity ?? 0, revenue: i._sum.lineTotal ?? 0 })),
    lowStock,
    recent,
  };
}
