"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import {
  endCustomerSession, getCustomer, hashPassword, startCustomerSession, verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { notifyAdmins, notifyCustomer } from "@/lib/services/notifications";
import { siteUrl } from "@/lib/utils";
import { fieldErrors, loginSchema, passwordSchema, phoneSchema, registerSchema } from "@/lib/validation";

type State = { error?: string; fields?: Record<string, string>; ok?: boolean } | undefined;
const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
// Equalise timing when the account does not exist.
let dummy: string | null = null;
const dummyHash = async () => (dummy ??= await hashPassword("della-timing-equaliser"));

export async function register(_: State, form: FormData): Promise<State> {
  if (!rateLimit(`register:${await clientIp()}`, 5, 3600_000).ok) return { error: "RATE_LIMITED" };
  const p = registerSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { fields: fieldErrors(p.error) };
  const exists = await db.customer.findUnique({ where: { email: p.data.email } });
  if (exists?.passwordHash) return { fields: { email: "EMAIL_TAKEN" } };
  const passwordHash = await hashPassword(p.data.password);
  // A guest record with this email may exist from earlier orders — claim it.
  const c = exists
    ? await db.customer.update({ where: { id: exists.id }, data: { name: p.data.name, phone: p.data.phone ?? exists.phone, passwordHash } })
    : await db.customer.create({ data: { name: p.data.name, email: p.data.email, phone: p.data.phone, passwordHash } });
  // Link earlier guest orders placed with the same email.
  await db.order.updateMany({ where: { customerId: null, email: p.data.email }, data: { customerId: c.id } });
  await startCustomerSession(c.id, c.sessionVersion);
  await audit({ actorType: "CUSTOMER", actorId: c.id, action: "customer.register", entity: "Customer", entityId: c.id });
  redirect(safeNext(form.get("next")));
}

export async function login(_: State, form: FormData): Promise<State> {
  const ip = await clientIp();
  const p = loginSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { fields: fieldErrors(p.error) };
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000).ok || !rateLimit(`login:${p.data.email}`, 8, 15 * 60_000).ok) return { error: "RATE_LIMITED" };
  const c = await db.customer.findUnique({ where: { email: p.data.email } });
  const ok = await verifyPassword(p.data.password, c?.passwordHash ?? (await dummyHash()));
  if (!c || !c.passwordHash || !ok || c.status === "SUSPENDED" || c.status === "DELETED") return { error: "INVALID_CREDENTIALS" };
  await startCustomerSession(c.id, c.sessionVersion);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endCustomerSession();
  redirect("/");
}

export async function requestPasswordReset(_: State, form: FormData): Promise<State> {
  if (!rateLimit(`reset:${await clientIp()}`, 5, 3600_000).ok) return { error: "RATE_LIMITED" };
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { fields: { email: "INVALID_EMAIL" } };
  const c = await db.customer.findUnique({ where: { email: email.data } });
  if (c?.passwordHash && c.status === "ACTIVE") {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({ data: { customerId: c.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const link = siteUrl(`/account/reset?token=${token}`);
    await notifyCustomer("PASSWORD_RESET", { email: c.email }, c.locale === "ar" ? "إعادة تعيين كلمة المرور — ديلا" : "Reset your DELLA password",
      `${c.locale === "ar" ? "لإعادة تعيين كلمة المرور افتحي الرابط (صالح لساعة):" : "Open this link to reset your password (valid 1 hour):"} ${link}`);
    if (process.env.NODE_ENV !== "production") console.info(`[dev] password reset link for ${c.email}: ${link}`);
  }
  // Same response whether or not the account exists.
  return { ok: true };
}

export async function resetPassword(_: State, form: FormData): Promise<State> {
  const token = String(form.get("token") ?? "");
  const pw = passwordSchema.safeParse(form.get("password"));
  if (!pw.success) return { fields: { password: "PASSWORD_SHORT" } };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "EXPIRED" };
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Bumping sessionVersion signs out every existing session.
    db.customer.update({ where: { id: row.customerId }, data: { passwordHash: await hashPassword(pw.data), sessionVersion: { increment: 1 } } }),
  ]);
  await audit({ actorType: "CUSTOMER", actorId: row.customerId, action: "customer.password_reset", entity: "Customer", entityId: row.customerId });
  redirect("/account/login?reset=1");
}

export async function updateProfile(_: State, form: FormData): Promise<State> {
  const c = await getCustomer();
  if (!c) return { error: "UNAUTHORIZED" };
  const p = z.object({
    name: z.string().trim().min(2, "TOO_SHORT").max(80),
    phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { fields: fieldErrors(p.error) };
  await db.customer.update({ where: { id: c.id }, data: { name: p.data.name, phone: p.data.phone ?? null } });
  revalidatePath("/account");
  return { ok: true };
}

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(3, "TOO_SHORT").max(80),
  phone: phoneSchema,
  localityId: z.string().min(1, "REQUIRED").max(40),
  street: z.string().trim().min(1, "REQUIRED").max(120),
  details: z.string().trim().min(1, "REQUIRED").max(200),
  landmark: z.string().trim().max(120).optional(),
});

export async function addAddress(_: State, form: FormData): Promise<State> {
  const c = await getCustomer();
  if (!c) return { error: "UNAUTHORIZED" };
  const p = addressSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { fields: fieldErrors(p.error) };
  if (!(await db.locality.findUnique({ where: { id: p.data.localityId } }))) return { fields: { localityId: "REQUIRED" } };
  const count = await db.customerAddress.count({ where: { customerId: c.id } });
  if (count >= 10) return { error: "USAGE_LIMIT" };
  await db.customerAddress.create({ data: { ...p.data, customerId: c.id, isDefault: count === 0 } });
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteAddress(form: FormData) {
  const c = await getCustomer();
  if (!c) return;
  await db.customerAddress.deleteMany({ where: { id: String(form.get("id")), customerId: c.id } });
  revalidatePath("/account");
}

/** GDPR-style deletion request — staff review it (orders must be retained for accounting). */
export async function requestDeletion() {
  const c = await getCustomer();
  if (!c) return;
  await db.customer.update({ where: { id: c.id }, data: { status: "DELETION_REQUESTED", deletionRequestedAt: new Date() } });
  await notifyAdmins("NEW_INQUIRY", "Account deletion request", `${c.name} <${c.email}>`);
  await audit({ actorType: "CUSTOMER", actorId: c.id, action: "customer.deletion_requested", entity: "Customer", entityId: c.id });
  revalidatePath("/account");
}
