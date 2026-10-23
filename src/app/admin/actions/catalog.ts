"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, bool, fd, type ActionResult } from "@/lib/admin-action";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { notifyAdmins } from "@/lib/services/notifications";
import { slugify } from "@/lib/utils";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const img = z.string().trim().max(500).optional().transform((v) => (v && (v.startsWith("/") || v.startsWith("https://")) ? v : null));

export async function saveCategory(_: ActionResult, form: FormData) {
  return adminAction("catalog.manage", async (admin) => {
    const v = z.object({
      id: z.string().optional(), nameAr: z.string().trim().min(2).max(80), nameEn: z.string().trim().min(2).max(80),
      slug: z.string().trim().max(80).optional(), descAr: opt(400), descEn: opt(400), image: img,
      sortOrder: z.coerce.number().int().min(0).max(999).default(0), seoTitle: opt(120), seoDesc: opt(300),
    }).parse(fd(form));
    const data = { ...v, id: undefined, slug: slugify(v.slug || v.nameEn), visible: bool(form.get("visible")) };
    const c = v.id ? await db.category.update({ where: { id: v.id }, data }) : await db.category.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: v.id ? "category.update" : "category.create", entity: "Category", entityId: c.id });
    revalidatePath("/", "layout");
  });
}

export async function archiveCategory(_: ActionResult, form: FormData) {
  return adminAction("catalog.manage", async (admin) => {
    const id = String(form.get("id"));
    const archived = form.get("archived") === "1";
    await db.category.update({ where: { id }, data: { archived, visible: archived ? false : undefined } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: archived ? "category.archive" : "category.restore", entity: "Category", entityId: id });
    revalidatePath("/", "layout");
  });
}

export async function saveBrand(_: ActionResult, form: FormData) {
  return adminAction("catalog.manage", async (admin) => {
    const v = z.object({ id: z.string().optional(), nameAr: z.string().trim().min(1).max(80), nameEn: z.string().trim().min(1).max(80), logo: img, sortOrder: z.coerce.number().int().min(0).max(999).default(0) }).parse(fd(form));
    const data = { nameAr: v.nameAr, nameEn: v.nameEn, logo: v.logo, sortOrder: v.sortOrder, slug: slugify(v.nameEn), visible: bool(form.get("visible")) };
    const b = v.id ? await db.brand.update({ where: { id: v.id }, data }) : await db.brand.create({ data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "brand.save", entity: "Brand", entityId: b.id });
    revalidatePath("/", "layout");
  });
}

export async function deleteBrand(_: ActionResult, form: FormData) {
  return adminAction("catalog.manage", async (admin) => {
    const id = String(form.get("id"));
    if (await db.product.count({ where: { brandId: id } })) return { error: "IN_USE" };
    await db.brand.delete({ where: { id } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "brand.delete", entity: "Brand", entityId: id });
    revalidatePath("/admin/categories");
  });
}

/** Inventory update. A quantity change is recorded as an adjustment with its reason (full history). */
export async function updateInventory(_: ActionResult, form: FormData) {
  return adminAction("inventory.manage", async (admin) => {
    const v = z.object({
      id: z.string().min(1),
      availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "PREORDER", "UNVERIFIED"]),
      quantity: z.coerce.number().int().min(0).max(100000),
      lowStockThreshold: z.coerce.number().int().min(0).max(1000),
      partnerRef: z.string().trim().max(80).optional(),
      note: z.string().trim().max(200).optional(),
    }).parse(fd(form));
    const inv = await db.inventory.findUniqueOrThrow({ where: { id: v.id }, include: { variant: { include: { product: true } } } });
    if (admin.partnerId && inv.variant.product.partnerId !== admin.partnerId) return { error: "FORBIDDEN" };
    const trackQuantity = bool(form.get("trackQuantity"));
    const verified = bool(form.get("verified"));
    let availability = v.availability;
    if (trackQuantity && v.quantity === 0 && availability === "IN_STOCK") availability = "OUT_OF_STOCK";
    await db.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: v.id },
        data: { availability, trackQuantity, quantity: v.quantity, lowStockThreshold: v.lowStockThreshold, partnerRef: v.partnerRef || null, verified, verifiedAt: verified && !inv.verified ? new Date() : inv.verifiedAt },
      });
      if (v.quantity !== inv.quantity) {
        await tx.stockAdjustment.create({ data: { inventoryId: v.id, delta: v.quantity - inv.quantity, quantityAfter: v.quantity, reason: "MANUAL", note: v.note || null, actorId: admin.id } });
      }
    });
    if (trackQuantity && v.quantity <= v.lowStockThreshold && (await getSettings()).notifications.lowStockAlerts) {
      await notifyAdmins("LOW_STOCK", "Low stock", `${inv.variant.sku}: ${v.quantity}`);
    }
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "inventory.update", entity: "Inventory", entityId: v.id, data: { sku: inv.variant.sku, from: inv.quantity, to: v.quantity, availability, verified } });
    revalidatePath("/admin/inventory");
    revalidatePath("/", "layout");
  });
}

export async function moderateReview(_: ActionResult, form: FormData) {
  return adminAction("products.manage", async (admin) => {
    const id = String(form.get("id"));
    const status = z.enum(["APPROVED", "REJECTED", "PENDING"]).parse(form.get("status"));
    await db.review.update({ where: { id }, data: { status } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: `review.${status.toLowerCase()}`, entity: "Review", entityId: id });
    revalidatePath("/", "layout");
  });
}
