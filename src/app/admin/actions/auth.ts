"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { endAdminSession, getAdmin, hashPassword, startAdminSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { loginSchema } from "@/lib/validation";

let dummy: string | null = null;
const dummyHash = async () => (dummy ??= await hashPassword("della-admin-timing"));

export async function adminLogin(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const ip = await clientIp();
  const p = loginSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "INVALID_CREDENTIALS" };
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60_000).ok || !rateLimit(`admin-login:${p.data.email}`, 5, 15 * 60_000).ok) {
    await audit({ actorType: "SYSTEM", action: "admin.login.rate_limited", entity: "AdminUser", data: { email: p.data.email } });
    return { error: "RATE_LIMITED" };
  }
  const u = await db.adminUser.findUnique({ where: { email: p.data.email } });
  const ok = await verifyPassword(p.data.password, u?.passwordHash ?? (await dummyHash()));
  if (!u || !ok || !u.active) {
    await audit({ actorType: "SYSTEM", action: "admin.login.failed", entity: "AdminUser", entityId: u?.id, data: { email: p.data.email } });
    return { error: "INVALID_CREDENTIALS" };
  }
  await db.adminUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await startAdminSession(u.id, u.sessionVersion);
  await audit({ actorType: "ADMIN", actorId: u.id, actorName: u.name, action: "admin.login", entity: "AdminUser", entityId: u.id });
  redirect("/admin");
}

export async function adminLogout() {
  const a = await getAdmin();
  if (a) await audit({ actorType: "ADMIN", actorId: a.id, actorName: a.name, action: "admin.logout", entity: "AdminUser", entityId: a.id });
  await endAdminSession();
  redirect("/admin/login");
}
