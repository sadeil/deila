import type { Prisma, PrismaClient, Coupon } from "@prisma/client";
import { db } from "../db";
import { asStringArray } from "../utils";
import { allocateDiscount } from "./commission";

type Tx = PrismaClient | Prisma.TransactionClient;

export type CartInputItem = { variantId: string; quantity: number };

export type QuoteLine = {
  variantId: string;
  productId: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  variantNameAr: string | null;
  variantNameEn: string | null;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  maxQuantity: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNVERIFIED";
  isDemo: boolean;
  priceVerified: boolean;
  issue: null | "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "QUANTITY_ADJUSTED";
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  discountShares: number[];
  coupon: null | { code: string; valid: boolean; reason?: string; type?: string; freeShipping?: boolean };
  shipping: null | {
    localityId: string;
    serviceable: boolean;
    fee: number;
    freeShippingApplied: boolean;
    freeShippingMin: number | null;
    etaMinDays: number;
    etaMaxDays: number;
    codAvailable: boolean;
    zoneNameAr: string;
    zoneNameEn: string;
  };
  total: number;
  errors: string[];
};

export const MAX_LINES = 30;

export async function quoteCart(
  input: { items: CartInputItem[]; couponCode?: string | null; localityId?: string | null; phone?: string | null; maxQtyPerItem?: number },
  tx: Tx = db,
): Promise<Quote> {
  const maxQty = input.maxQtyPerItem ?? 5;
  const errors: string[] = [];

  // Merge duplicates & drop junk. Client-sent prices are never read.
  const merged = new Map<string, number>();
  for (const it of input.items.slice(0, MAX_LINES)) {
    const q = Math.floor(Number(it.quantity));
    if (!it.variantId || !Number.isFinite(q) || q < 1) continue;
    merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + q);
  }

  const variants = await tx.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: {
      inventory: true,
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
    },
  });

  const lines: QuoteLine[] = [];
  for (const [variantId, requested] of merged) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) { errors.push("ITEM_NOT_FOUND"); continue; }
    const p = v.product;
    const inv = v.inventory;
    const availability = inv?.availability ?? "UNVERIFIED";
    let issue: QuoteLine["issue"] = null;
    let max = maxQty;
    if (p.status !== "PUBLISHED" || !v.active) { issue = "UNAVAILABLE"; max = 0; }
    else if (availability === "OUT_OF_STOCK") { issue = "OUT_OF_STOCK"; max = 0; }
    else if (inv?.trackQuantity) {
      max = Math.min(maxQty, Math.max(0, inv.quantity));
      if (max === 0) issue = "OUT_OF_STOCK";
    }
    let quantity = requested;
    if (max > 0 && quantity > max) {
      quantity = max;
      issue = inv?.trackQuantity && inv.quantity < requested ? "INSUFFICIENT_STOCK" : "QUANTITY_ADJUSTED";
    }
    if (max === 0) quantity = 0;
    const unitPrice = v.price ?? p.price;
    lines.push({
      variantId, productId: p.id, slug: p.slug, sku: v.sku,
      nameAr: p.nameAr, nameEn: p.nameEn,
      variantNameAr: v.isDefault ? null : v.nameAr, variantNameEn: v.isDefault ? null : v.nameEn,
      image: p.images[0]?.url ?? null,
      unitPrice,
      compareAtPrice: p.compareAtPrice && p.compareAtPrice > unitPrice ? p.compareAtPrice : null,
      quantity, lineTotal: unitPrice * quantity, maxQuantity: max,
      availability, isDemo: p.isDemo, priceVerified: p.priceVerified, issue,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  // ── Coupon (one per order; does not stack with other coupons) ──
  let discount = 0;
  let discountShares = lines.map(() => 0);
  let coupon: Quote["coupon"] = null;
  let freeShippingByCoupon = false;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    const c = await tx.coupon.findUnique({ where: { code } });
    const res = c ? await evaluateCoupon(c, lines, subtotal, input.phone ?? null, tx) : { ok: false as const, reason: "NOT_FOUND" };
    if (res.ok && c) {
      discount = res.discount;
      discountShares = allocateDiscount(lines.map((l) => l.lineTotal), discount, res.eligible);
      freeShippingByCoupon = c.type === "FREE_SHIPPING";
      coupon = { code, valid: true, type: c.type, freeShipping: freeShippingByCoupon };
    } else {
      coupon = { code, valid: false, reason: res.ok ? undefined : res.reason };
    }
  }

  // ── Shipping (server-side, from admin-configured zones) ──
  let shipping: Quote["shipping"] = null;
  if (input.localityId) {
    const loc = await tx.locality.findUnique({
      where: { id: input.localityId },
      include: { zone: true, governorate: true },
    });
    if (!loc) errors.push("LOCALITY_NOT_FOUND");
    else {
      const zone = loc.zone;
      const serviceable = !!(loc.active && loc.governorate.active && zone && zone.active);
      const merch = subtotal - discount;
      const freeByThreshold = !!(zone?.freeShippingMin != null && merch >= zone.freeShippingMin);
      const free = serviceable && (freeByThreshold || freeShippingByCoupon);
      shipping = {
        localityId: loc.id,
        serviceable,
        fee: serviceable && zone ? (free ? 0 : zone.fee) : 0,
        freeShippingApplied: free,
        freeShippingMin: zone?.freeShippingMin ?? null,
        etaMinDays: zone?.etaMinDays ?? 0,
        etaMaxDays: zone?.etaMaxDays ?? 0,
        codAvailable: serviceable && !!zone?.codAvailable && loc.codAvailable,
        zoneNameAr: zone?.nameAr ?? "",
        zoneNameEn: zone?.nameEn ?? "",
      };
      if (!serviceable) errors.push("NOT_SERVICEABLE");
    }
  }

  if (lines.some((l) => l.issue === "UNAVAILABLE" || l.issue === "OUT_OF_STOCK")) errors.push("UNAVAILABLE_ITEMS");
  if (!lines.some((l) => l.quantity > 0)) errors.push("EMPTY_CART");

  const total = subtotal - discount + (shipping?.fee ?? 0);
  return { lines, subtotal, discount, discountShares, coupon, shipping, total, errors };
}

async function evaluateCoupon(
  c: Coupon,
  lines: QuoteLine[],
  subtotal: number,
  phone: string | null,
  tx: Tx,
): Promise<{ ok: true; discount: number; eligible: boolean[] } | { ok: false; reason: string }> {
  const now = new Date();
  if (!c.active) return { ok: false, reason: "INACTIVE" };
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: "NOT_STARTED" };
  if (c.endsAt && c.endsAt < now) return { ok: false, reason: "EXPIRED" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, reason: "USAGE_LIMIT" };
  if (c.minOrder != null && subtotal < c.minOrder) return { ok: false, reason: "MIN_ORDER" };
  if (c.perCustomerLimit != null && phone) {
    const used = await tx.couponRedemption.count({ where: { couponId: c.id, phone } });
    if (used >= c.perCustomerLimit) return { ok: false, reason: "CUSTOMER_LIMIT" };
  }
  const productIds = asStringArray(c.productIds);
  const categoryIds = asStringArray(c.categoryIds);
  let categoryOf: Map<string, string> | null = null;
  if (categoryIds.length) {
    const ps = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, select: { id: true, categoryId: true } });
    categoryOf = new Map(ps.map((p) => [p.id, p.categoryId]));
  }
  const eligible = lines.map((l) => {
    if (l.quantity === 0) return false;
    if (c.excludeSaleItems && l.compareAtPrice) return false;
    if (productIds.length && !productIds.includes(l.productId)) return false;
    if (categoryIds.length && !categoryIds.includes(categoryOf?.get(l.productId) ?? "")) return false;
    return true;
  });
  const eligibleTotal = lines.reduce((s, l, i) => s + (eligible[i] ? l.lineTotal : 0), 0);
  if (eligibleTotal === 0) return { ok: false, reason: "NO_ELIGIBLE_ITEMS" };
  let discount = 0;
  if (c.type === "PERCENT") discount = Math.floor((eligibleTotal * Math.min(100, Math.max(0, c.value))) / 100);
  else if (c.type === "FIXED") discount = Math.min(c.value, eligibleTotal);
  return { ok: true, discount, eligible };
}
