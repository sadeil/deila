import "server-only";
import { db } from "./db";
import { asSpecs, asStringArray } from "./utils";
import type { ProductInput } from "@/components/admin/ProductEditor";

export async function editorOptions(locale: "ar" | "en") {
  const [categories, brands, partners] = await Promise.all([
    db.category.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ orderBy: { sortOrder: "asc" } }),
    db.partner.findMany({ where: { active: true } }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, label: locale === "ar" ? c.nameAr : c.nameEn })),
    brands: brands.map((c) => ({ id: c.id, label: locale === "ar" ? c.nameAr : c.nameEn })),
    partners: partners.map((p) => ({ id: p.id, label: p.name })),
  };
}

export async function productInput(id: string): Promise<ProductInput | null> {
  const p = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } } } });
  if (!p) return null;
  const s = (v: string | null) => v ?? "";
  return {
    id: p.id, nameAr: p.nameAr, nameEn: p.nameEn, slug: p.slug, sku: p.sku, model: s(p.model),
    shortAr: s(p.shortAr), shortEn: s(p.shortEn), descAr: s(p.descAr), descEn: s(p.descEn),
    featuresAr: asStringArray(p.featuresAr).join("\n"), featuresEn: asStringArray(p.featuresEn).join("\n"),
    price: (p.price / 100).toString(), compareAtPrice: p.compareAtPrice ? (p.compareAtPrice / 100).toString() : "",
    priceVerified: p.priceVerified, isDemo: p.isDemo, status: p.status,
    categoryId: p.categoryId, brandId: s(p.brandId), partnerId: p.partnerId,
    featured: p.featured, newArrival: p.newArrival, returnEligible: p.returnEligible,
    warrantyAr: s(p.warrantyAr), warrantyEn: s(p.warrantyEn), videoUrl: s(p.videoUrl), seoTitle: s(p.seoTitle), seoDesc: s(p.seoDesc),
    commissionType: p.commissionType ?? "", commissionValue: p.commissionValue != null ? (p.commissionValue / 100).toString() : "",
    images: p.images.map((i) => ({ url: i.url, altAr: s(i.altAr), altEn: s(i.altEn) })),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, nameAr: v.nameAr, nameEn: v.nameEn, colorHex: v.colorHex, price: v.price, active: v.active, isDefault: v.isDefault })),
    specs: asSpecs(p.specs),
  };
}

export async function blankProduct(): Promise<ProductInput> {
  const [cat, partner] = await Promise.all([db.category.findFirst({ where: { archived: false }, orderBy: { sortOrder: "asc" } }), db.partner.findFirst({ where: { active: true } })]);
  return {
    nameAr: "", nameEn: "", slug: "", sku: "", model: "", shortAr: "", shortEn: "", descAr: "", descEn: "", featuresAr: "", featuresEn: "",
    price: "", compareAtPrice: "", priceVerified: false, isDemo: false, status: "DRAFT",
    categoryId: cat?.id ?? "", brandId: "", partnerId: partner?.id ?? "", featured: false, newArrival: true, returnEligible: true,
    warrantyAr: "", warrantyEn: "", videoUrl: "", seoTitle: "", seoDesc: "", commissionType: "", commissionValue: "",
    images: [], variants: [], specs: [],
  };
}
