import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, include: { inventory: true } },
  category: { select: { nameAr: true, nameEn: true, slug: true } },
  brand: { select: { nameAr: true, nameEn: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export type ProductCardData = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  shortAr: string | null;
  shortEn: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  image2: string | null;
  altAr: string | null;
  altEn: string | null;
  isDemo: boolean;
  priceVerified: boolean;
  newArrival: boolean;
  categoryAr: string;
  categoryEn: string;
  brand: string | null;
  defaultVariantId: string | null;
  variantCount: number;
  swatches: { id: string; colorHex: string | null; nameAr: string; nameEn: string }[];
  soldOut: boolean;
};

export function toCard(p: CardRow): ProductCardData {
  const variants = p.variants;
  const def = variants.find((v) => v.isDefault) ?? variants[0];
  const soldOut = variants.length > 0 && variants.every((v) => v.inventory?.availability === "OUT_OF_STOCK" || (v.inventory?.trackQuantity && v.inventory.quantity <= 0));
  return {
    id: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, shortAr: p.shortAr, shortEn: p.shortEn,
    price: def?.price ?? p.price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > (def?.price ?? p.price) ? p.compareAtPrice : null,
    image: p.images[0]?.url ?? null, image2: p.images[1]?.url ?? null,
    altAr: p.images[0]?.altAr ?? null, altEn: p.images[0]?.altEn ?? null,
    isDemo: p.isDemo, priceVerified: p.priceVerified, newArrival: p.newArrival,
    categoryAr: p.category.nameAr, categoryEn: p.category.nameEn,
    brand: p.brand?.nameEn ?? null,
    defaultVariantId: def?.id ?? null,
    variantCount: variants.length,
    swatches: variants.filter((v) => v.colorHex).map((v) => ({ id: v.id, colorHex: v.colorHex, nameAr: v.nameAr, nameEn: v.nameEn })),
    soldOut,
  };
}

const PUBLIC: Prisma.ProductWhereInput = { status: "PUBLISHED", category: { visible: true, archived: false } };

/** Units sold on orders that were not canceled or returned — the only basis for "best seller". */
export async function salesByProduct() {
  const rows = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { notIn: ["CANCELED", "RETURNED"] } } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}

export type ShopQuery = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number; // shekels
  max?: number;
  availability?: "in_stock";
  sort?: "new" | "price_asc" | "price_desc" | "popular" | "featured";
  page?: number;
};

export const PER_PAGE = 12;

export async function listProducts(query: ShopQuery) {
  const and: Prisma.ProductWhereInput[] = [PUBLIC];
  if (query.q) {
    const q = query.q.trim().slice(0, 60);
    and.push({ OR: [{ nameAr: { contains: q } }, { nameEn: { contains: q } }, { sku: { contains: q } }, { model: { contains: q } }, { shortAr: { contains: q } }, { shortEn: { contains: q } }] });
  }
  if (query.category) and.push({ category: { slug: query.category } });
  if (query.brand) and.push({ brand: { slug: query.brand } });
  if (query.min != null) and.push({ price: { gte: Math.round(query.min * 100) } });
  if (query.max != null) and.push({ price: { lte: Math.round(query.max * 100) } });
  if (query.availability === "in_stock") and.push({ variants: { some: { active: true, inventory: { availability: "IN_STOCK", verified: true } } } });
  const where: Prisma.ProductWhereInput = { AND: and };

  const page = Math.max(1, query.page ?? 1);
  const total = await db.product.count({ where });

  if (query.sort === "popular") {
    const all = await db.product.findMany({ where, include: productCardInclude });
    const sales = await salesByProduct();
    all.sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0) || +b.createdAt - +a.createdAt);
    return { items: all.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(toCard), total, page, pages: Math.ceil(total / PER_PAGE) };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "price_asc" ? [{ price: "asc" }] :
    query.sort === "price_desc" ? [{ price: "desc" }] :
    query.sort === "new" ? [{ createdAt: "desc" }] :
    [{ featured: "desc" }, { createdAt: "desc" }];

  const rows = await db.product.findMany({ where, include: productCardInclude, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE });
  return { items: rows.map(toCard), total, page, pages: Math.ceil(total / PER_PAGE) };
}

export async function getFacets() {
  const [categories, brands, range] = await Promise.all([
    db.category.findMany({ where: { visible: true, archived: false }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } } }),
    db.brand.findMany({ where: { visible: true, products: { some: { status: "PUBLISHED" } } }, orderBy: { sortOrder: "asc" } }),
    db.product.aggregate({ where: PUBLIC, _min: { price: true }, _max: { price: true } }),
  ]);
  return { categories, brands, minPrice: Math.floor((range._min.price ?? 0) / 100), maxPrice: Math.ceil((range._max.price ?? 0) / 100) };
}

export async function productsWhere(where: Prisma.ProductWhereInput, take: number, orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" }) {
  const rows = await db.product.findMany({ where: { AND: [PUBLIC, where] }, include: productCardInclude, take, orderBy });
  return rows.map(toCard);
}

export async function bestSellers(take: number) {
  const sales = await salesByProduct();
  const ids = [...sales.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, take).map(([id]) => id);
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { AND: [PUBLIC, { id: { in: ids } }] }, include: productCardInclude });
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((r) => toCard(r!));
}

export async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { AND: [PUBLIC, { slug }] },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, include: { inventory: true } },
      category: true,
      brand: true,
      partner: { select: { warrantyByPartner: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { customer: { select: { name: true } } } },
    },
  });
}

type VariantWithInv = Prisma.ProductVariantGetPayload<{ include: { inventory: true } }>;
export function toPurchaseVariants(productPrice: number, variants: VariantWithInv[], maxQtyPerItem: number) {
  return variants.map((v) => {
    const inv = v.inventory;
    const availability = inv?.availability ?? "UNVERIFIED";
    let maxQty = availability === "OUT_OF_STOCK" ? 0 : maxQtyPerItem;
    if (inv?.trackQuantity) maxQty = Math.min(maxQty, Math.max(0, inv.quantity));
    return {
      id: v.id, nameAr: v.nameAr, nameEn: v.nameEn, colorHex: v.colorHex, price: v.price ?? productPrice,
      isDefault: v.isDefault, availability, verified: !!inv?.verified, maxQty,
      lowStock: !!inv?.trackQuantity && inv.quantity > 0 && inv.quantity <= inv.lowStockThreshold,
    };
  });
}
