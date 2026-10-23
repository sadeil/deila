"use server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { adminAction, bool, fd, type ActionResult } from "@/lib/admin-action";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/rbac";
import { saveSetting, SETTINGS_DEFAULTS, type SettingsKey } from "@/lib/settings";
import { passwordSchema } from "@/lib/validation";

// ───────── Customers ─────────

export async function updateCustomer(_: ActionResult, form: FormData) {
  return adminAction("customers.manage", async (admin) => {
    const v = z.object({ id: z.string().min(1), status: z.enum(["ACTIVE", "SUSPENDED", "DELETION_REQUESTED", "DELETED"]), supportNotes: z.string().max(4000).optional() }).parse(fd(form));
    const before = await db.customer.findUniqueOrThrow({ where: { id: v.id } });
    // Completing a deletion anonymises personal data; orders are retained for accounting.
    const anonymise = v.status === "DELETED" && before.status !== "DELETED";
    await db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: v.id },
        data: {
          status: v.status, supportNotes: v.supportNotes ?? null,
          sessionVersion: v.status !== "ACTIVE" ? { increment: 1 } : undefined,
          ...(anonymise ? { name: "Deleted customer", email: null, phone: null, passwordHash: null } : {}),
        },
      });
      if (anonymise) {
        await tx.customerAddress.deleteMany({ where: { customerId: v.id } });
        await tx.wishlistItem.deleteMany({ where: { customerId: v.id } });
      }
    });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: anonymise ? "customer.anonymised" : "customer.update", entity: "Customer", entityId: v.id, data: { status: v.status } });
    revalidatePath(`/admin/customers/${v.id}`);
  });
}

// ───────── Homepage & content ─────────

const SECTION_TYPES = ["HERO", "CATEGORIES", "COLLECTIONS", "FEATURED", "BEST_SELLERS", "NEW_ARRIVALS", "SPOTLIGHT", "LIFESTYLE", "STORY", "OFFERS", "WHY", "REVIEWS", "NEWSLETTER", "SOCIAL"] as const;

export async function saveSection(_: ActionResult, form: FormData) {
  return adminAction("content.manage", async (admin) => {
    const v = z.object({
      id: z.string().min(1), titleAr: z.string().max(200).optional(), titleEn: z.string().max(200).optional(),
      config: z.string().max(20000),
    }).parse(fd(form));
    let config: Prisma.InputJsonValue;
    try { config = JSON.parse(v.config || "{}"); } catch { return { error: "VALIDATION", fields: { config: "INVALID_JSON" } }; }
    if (!config || typeof config !== "object" || Array.isArray(config)) return { error: "VALIDATION", fields: { config: "INVALID_JSON" } };
    // Only same-site or https links/images may be stored.
    const bad = JSON.stringify(config).match(/"(?:href|image|[a-zA-Z]*Href)":"(?!\/|https:\/\/)[^"]*"/);
    if (bad) return { error: "VALIDATION", fields: { config: "UNSAFE_URL" } };
    await db.homepageSection.update({ where: { id: v.id }, data: { titleAr: v.titleAr || null, titleEn: v.titleEn || null, config, visible: bool(form.get("visible")) } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "homepage.section.update", entity: "HomepageSection", entityId: v.id });
    revalidatePath("/", "layout");
  });
}

export async function moveSection(_: ActionResult, form: FormData) {
  return adminAction("content.manage", async (admin) => {
    const id = String(form.get("id"));
    const dir = form.get("dir") === "up" ? -1 : 1;
    const all = await db.homepageSection.findMany({ orderBy: { sortOrder: "asc" } });
    const i = all.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    await db.$transaction(all.map((s, k) => db.homepageSection.update({ where: { id: s.id }, data: { sortOrder: k } })));
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "homepage.reorder", entity: "HomepageSection", entityId: id });
    revalidatePath("/", "layout");
  });
}

export async function addSection(_: ActionResult, form: FormData) {
  return adminAction("content.manage", async (admin) => {
    const type = z.enum(SECTION_TYPES).parse(form.get("type"));
    const max = await db.homepageSection.aggregate({ _max: { sortOrder: true } });
    const s = await db.homepageSection.create({ data: { type, sortOrder: (max._max.sortOrder ?? 0) + 1, visible: false, config: {} } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "homepage.section.add", entity: "HomepageSection", entityId: s.id, data: { type } });
    revalidatePath("/admin/content");
  });
}

export async function deleteSection(_: ActionResult, form: FormData) {
  return adminAction("content.manage", async (admin) => {
    const id = String(form.get("id"));
    await db.homepageSection.delete({ where: { id } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "homepage.section.delete", entity: "HomepageSection", entityId: id });
    revalidatePath("/", "layout");
  });
}

export async function savePage(_: ActionResult, form: FormData) {
  return adminAction("content.manage", async (admin) => {
    const v = z.object({
      slug: z.string().regex(/^[a-z0-9-]{2,40}$/), titleAr: z.string().trim().min(1).max(120), titleEn: z.string().trim().min(1).max(120),
      bodyAr: z.string().max(30000), bodyEn: z.string().max(30000),
    }).parse(fd(form));
    const data = { ...v, published: bool(form.get("published")) };
    await db.contentPage.upsert({ where: { slug: v.slug }, create: data, update: data });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "page.save", entity: "ContentPage", entityId: v.slug });
    revalidatePath("/", "layout");
  });
}

// ───────── Settings ─────────

const SETTINGS_PERMS: Record<SettingsKey, "settings.manage" | "content.manage"> = {
  store: "settings.manage", social: "content.manage", announcement: "content.manage", footer: "content.manage", seo: "settings.manage",
  policies: "settings.manage", payments: "settings.manage", commission: "settings.manage", notifications: "settings.manage", catalog: "settings.manage",
};

/** Generic settings writer: only keys present in the defaults are accepted; types follow the defaults. */
export async function saveSettings(_: ActionResult, form: FormData) {
  const key = String(form.get("_key")) as SettingsKey;
  if (!(key in SETTINGS_DEFAULTS)) return { error: "VALIDATION" };
  return adminAction(SETTINGS_PERMS[key], async (admin) => {
    const defaults = SETTINGS_DEFAULTS[key] as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(defaults)) {
      const raw = form.get(k);
      if (typeof def === "boolean") out[k] = bool(raw);
      else if (typeof def === "number") {
        if (raw == null || raw === "") continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return { error: "VALIDATION", fields: { [k]: "INVALID_AMOUNT" } };
        out[k] = k === "defaultValue" ? Math.round(n * 100) : Math.round(n);
      } else if (raw != null) {
        const s = String(raw).trim().slice(0, 5000);
        if (/(url|link|instagram|facebook|tiktok)$/i.test(k) && s && !/^(https:\/\/|\/)/.test(s)) return { error: "VALIDATION", fields: { [k]: "INVALID_URL" } };
        out[k] = s;
      }
    }
    if (key === "payments" && out.merchantOfRecord !== "DELLA") out.merchantOfRecord = "PARTNER";
    if (key === "commission" && out.defaultType !== "FIXED") out.defaultType = "PERCENT";
    if (key === "store" && out.defaultLocale !== "en") out.defaultLocale = "ar";
    await saveSetting(key, out);
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: `settings.${key}`, entity: "StoreSetting", entityId: key, data: out as Prisma.InputJsonValue });
    revalidatePath("/", "layout");
  });
}

// ───────── Notifications & inquiries ─────────

export async function markNotificationsRead() {
  return adminAction("notifications.view", async () => {
    await db.notification.updateMany({ where: { channel: "IN_APP", status: "UNREAD" }, data: { status: "READ", readAt: new Date() } });
    revalidatePath("/admin", "layout");
  });
}

export async function closeInquiry(_: ActionResult, form: FormData) {
  return adminAction("customers.view", async (admin) => {
    const id = String(form.get("id"));
    await db.inquiry.update({ where: { id }, data: { status: "CLOSED" } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "inquiry.close", entity: "Inquiry", entityId: id });
    revalidatePath("/admin/notifications");
  });
}

// ───────── Staff & roles (Super Admin) ─────────

export async function saveStaff(_: ActionResult, form: FormData) {
  return adminAction("staff.manage", async (admin) => {
    const v = z.object({
      id: z.string().optional(), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(),
      roleId: z.string().min(1), partnerId: z.string().optional(), password: z.string().optional(),
    }).parse(fd(form));
    const role = await db.adminRole.findUniqueOrThrow({ where: { id: v.roleId } });
    const active = bool(form.get("active"));
    if (role.key === "FULFILLMENT_PARTNER" && !v.partnerId) return { error: "VALIDATION", fields: { partnerId: "REQUIRED" } };
    if (v.id) {
      const current = await db.adminUser.findUniqueOrThrow({ where: { id: v.id }, include: { role: true } });
      const demoting = current.role.key === "SUPER_ADMIN" && (role.key !== "SUPER_ADMIN" || !active);
      if (demoting && (await db.adminUser.count({ where: { active: true, role: { key: "SUPER_ADMIN" } } })) <= 1) return { error: "LAST_SUPER_ADMIN" };
    }
    let passwordHash: string | undefined;
    if (v.password) {
      const p = passwordSchema.safeParse(v.password);
      if (!p.success || v.password.length < 12) return { error: "VALIDATION", fields: { password: "PASSWORD_SHORT" } };
      passwordHash = await hashPassword(v.password);
    } else if (!v.id) return { error: "VALIDATION", fields: { password: "REQUIRED" } };
    const data = { name: v.name, email: v.email, roleId: v.roleId, partnerId: role.key === "FULFILLMENT_PARTNER" ? v.partnerId! : null, active };
    const u = v.id
      ? await db.adminUser.update({ where: { id: v.id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}), sessionVersion: { increment: 1 } } })
      : await db.adminUser.create({ data: { ...data, passwordHash: passwordHash! } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: v.id ? "staff.update" : "staff.create", entity: "AdminUser", entityId: u.id, data: { email: u.email, role: role.key, active } });
    revalidatePath("/admin/users");
  });
}

export async function saveRolePermissions(_: ActionResult, form: FormData) {
  return adminAction("staff.manage", async (admin) => {
    const id = String(form.get("id"));
    const role = await db.adminRole.findUniqueOrThrow({ where: { id } });
    if (role.key === "SUPER_ADMIN") return { error: "FORBIDDEN" };
    const perms = form.getAll("perm").map(String).filter((p): p is (typeof PERMISSIONS)[number] => (PERMISSIONS as readonly string[]).includes(p));
    await db.adminRole.update({ where: { id }, data: { permissions: perms } });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "role.permissions", entity: "AdminRole", entityId: id, data: { permissions: perms } });
    revalidatePath("/admin/users");
  });
}
