"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, bool, type ActionResult } from "@/lib/admin-action";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "INVALID_AMOUNT").transform((v) => Math.round(Number(v) * 100));
const optMoney = z.string().trim().optional().transform((v) => (v ? Math.round(Number(v) * 100) : null)).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "INVALID_AMOUNT");
const urlOk = (u: string) => u.startsWith("/") || /^https:\/\//.test(u);

const imageSchema = z.object({ url: z.string().max(500).refine(urlOk), altAr: z.string().max(200).default(""), altEn: z.string().max(200).default("") });
const variantSchema = z.object({
  id: z.string().max(40).optional(),
  sku: z.string().trim().min(1).max(60),
  nameAr: z.string().trim().min(1).max(60),
  nameEn: z.string().trim().min(1).max(60),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});
const specSchema = z.object({ labelAr: z.string().max(80), labelEn: z.string().max(80), valueAr: z.string().max(200), valueEn: z.string().max(200) });

const productSchema = z.object({
  id: z.string().max(40).optional(),
  nameAr: z.string().trim().min(2).max(140),
  nameEn: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(100).optional(),
  sku: z.string().trim().min(2).max(60),
  model: z.string().trim().max(80).optional(),
  shortAr: z.string().trim().max(300).optional(),
  shortEn: z.string().trim().max(300).optional(),
  descAr: z.string().trim().max(8000).optional(),
  descEn: z.string().trim().max(8000).optional(),
  featuresAr: z.string().max(3000).optional(),
  featuresEn: z.string().max(3000).optional(),
  price: money,
  compareAtPrice: optMoney,
  categoryId: z.string().min(1),
  brandId: z.string().optional(),
  partnerId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  warrantyAr: z.string().trim().max(500).optional(),
  warrantyEn: z.string().trim().max(500).optional(),
  videoUrl: z.string().trim().max(300).optional().refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//.test(v), "INVALID_URL"),
  seoTitle: z.string().trim().max(120).optional(),
  seoDesc: z.string().trim().max(300).optional(),
  commissionType: z.enum(["", "PERCENT", "FIXED"]).optional(),
  commissionValue: z.string().trim().optional(),
  images: z.string().transform((s) => z.array(imageSchema).max(20).parse(JSON.parse(s || "[]"))),
  variants: z.string().transform((s) => z.array(variantSchema).min(1).max(30).parse(JSON.parse(s || "[]"))),
  specs: z.string().transform((s) => z.array(specSchema).max(40).parse(JSON.parse(s || "[]"))),
});

const lines = (s?: string) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20);

export async function saveProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  let createdId: string | null = null;
  const res = await adminAction("products.manage", async (admin) => {
    const raw = Object.fromEntries(form) as Record<string, string>;
    const v = productSchema.parse(raw);
    if (v.compareAtPrice != null && v.compareAtPrice <= v.price) return { error: "VALIDATION", fields: { compareAtPrice: "INVALID_AMOUNT" } };
    const variants = v.variants;
    if (!variants.some((x) => x.isDefault)) variants[0].isDefault = true;
    let seenDefault = false;
    for (const x of variants) { if (x.isDefault && !seenDefault) seenDefault = true; else x.isDefault = false; }

    // Commission override: PERCENT entered as %, stored in basis points; FIXED entered in ₪, stored in agorot.
    let commissionType: "PERCENT" | "FIXED" | null = null;
    let commissionValue: number | null = null;
    if (v.commissionType && v.commissionValue) {
      const n = Number(v.commissionValue);
      if (!Number.isFinite(n) || n < 0 || (v.commissionType === "PERCENT" && n > 100)) return { error: "VALIDATION", fields: { commissionValue: "INVALID_AMOUNT" } };
      commissionType = v.commissionType;
      commissionValue = Math.round(n * 100);
    }

    const data = {
      nameAr: v.nameAr, nameEn: v.nameEn, sku: v.sku.toUpperCase(), model: v.model || null,
      slug: slugify(v.slug || v.nameEn) || slugify(v.sku),
      shortAr: v.shortAr || null, shortEn: v.shortEn || null, descAr: v.descAr || null, descEn: v.descEn || null,
      featuresAr: lines(v.featuresAr), featuresEn: lines(v.featuresEn), specs: v.specs,
      price: v.price, compareAtPrice: v.compareAtPrice,
      priceVerified: bool(form.get("priceVerified")), isDemo: bool(form.get("isDemo")),
      status: v.status, categoryId: v.categoryId, brandId: v.brandId || null, partnerId: v.partnerId,
      featured: bool(form.get("featured")), newArrival: bool(form.get("newArrival")), returnEligible: bool(form.get("returnEligible")),
      warrantyAr: v.warrantyAr || null, warrantyEn: v.warrantyEn || null, videoUrl: v.videoUrl || null,
      seoTitle: v.seoTitle || null, seoDesc: v.seoDesc || null, commissionType, commissionValue,
    };

    const id = await db.$transaction(async (tx) => {
      const p = v.id ? await tx.product.update({ where: { id: v.id }, data }) : await tx.product.create({ data });
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      if (v.images.length) await tx.productImage.createMany({ data: v.images.map((im, i) => ({ ...im, productId: p.id, sortOrder: i })) });

      const existing = await tx.productVariant.findMany({ where: { productId: p.id }, include: { _count: { select: { orderItems: true } } } });
      const keep = new Set<string>();
      for (const [i, x] of variants.entries()) {
        const vd = { sku: x.sku.toUpperCase(), nameAr: x.nameAr, nameEn: x.nameEn, colorHex: x.colorHex ?? null, price: x.price ?? null, active: x.active, isDefault: x.isDefault, sortOrder: i };
        if (x.id && existing.some((e) => e.id === x.id)) {
          await tx.productVariant.update({ where: { id: x.id }, data: vd });
          keep.add(x.id);
        } else {
          const nv = await tx.productVariant.create({ data: { ...vd, productId: p.id, inventory: { create: { availability: "UNVERIFIED" } } } });
          keep.add(nv.id);
        }
      }
      for (const e of existing.filter((e) => !keep.has(e.id))) {
        // Variants referenced by past orders are deactivated, never deleted (preserves history).
        if (e._count.orderItems > 0) await tx.productVariant.update({ where: { id: e.id }, data: { active: false, isDefault: false } });
        else await tx.productVariant.delete({ where: { id: e.id } });
      }
      return p.id;
    });

    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: v.id ? "product.update" : "product.create", entity: "Product", entityId: id, data: { sku: data.sku, status: data.status, price: data.price } });
    revalidatePath("/", "layout");
    if (!v.id) createdId = id;
    return { ok: true, id };
  });
  if (createdId) redirect(`/admin/products/${createdId}?created=1`);
  return res;
}

export async function setProductStatus(_: ActionResult, form: FormData) {
  return adminAction("products.manage", async (admin) => {
    const id = String(form.get("id"));
    const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(form.get("status"));
    await db.product.update({ where: { id }, data: { status } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: `product.${status.toLowerCase()}`, entity: "Product", entityId: id });
    revalidatePath("/", "layout");
  });
}

export async function duplicateProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  let newId: string | null = null;
  const res = await adminAction("products.manage", async (admin) => {
    const id = String(form.get("id"));
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { images: true, variants: true } });
    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const { id: _i, createdAt: _c, updatedAt: _u, images, variants, ...rest } = p;
    const copy = await db.product.create({
      data: {
        ...rest, featuresAr: rest.featuresAr ?? [], featuresEn: rest.featuresEn ?? [], specs: rest.specs ?? [],
        slug: `${p.slug}-copy-${suffix.toLowerCase()}`, sku: `${p.sku}-${suffix}`, nameAr: `${p.nameAr} (نسخة)`, nameEn: `${p.nameEn} (copy)`, status: "DRAFT",
        images: { create: images.map(({ url, altAr, altEn, sortOrder }) => ({ url, altAr, altEn, sortOrder })) },
        variants: { create: variants.map((v) => ({ sku: `${v.sku}-${suffix}`, nameAr: v.nameAr, nameEn: v.nameEn, colorHex: v.colorHex, price: v.price, active: v.active, isDefault: v.isDefault, sortOrder: v.sortOrder, inventory: { create: { availability: "UNVERIFIED" } } })) },
      },
    });
    newId = copy.id;
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "product.duplicate", entity: "Product", entityId: copy.id, data: { from: id } });
  });
  if (newId) redirect(`/admin/products/${newId}`);
  return res;
}

/** Hard delete only for products never ordered; otherwise the admin must archive. */
export async function deleteProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  let done = false;
  const res = await adminAction("products.manage", async (admin) => {
    const id = String(form.get("id"));
    const used = await db.orderItem.count({ where: { productId: id } });
    if (used) return { error: "IN_USE" };
    await db.product.delete({ where: { id } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "product.delete", entity: "Product", entityId: id });
    revalidatePath("/", "layout");
    done = true;
  });
  if (done) redirect("/admin/products");
  return res;
}
