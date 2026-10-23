import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hasPermission, type Permission } from "./rbac";

export const ADMIN_COOKIE = "della_admin";
export const CUSTOMER_COOKIE = "della_session";
const ADMIN_TTL = 60 * 60 * 10; // 10h
const CUSTOMER_TTL = 60 * 60 * 24 * 30; // 30d

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (≥32 chars)");
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

type Kind = "admin" | "customer";
async function sign(kind: Kind, sub: string, v: number, ttl: number) {
  return new SignJWT({ k: kind, v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

export async function readToken(token: string | undefined, kind: Kind) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.k !== kind || !payload.sub) return null;
    return { sub: payload.sub, v: Number(payload.v ?? 0) };
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number, path = "/") => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path,
  maxAge,
});

// ─────────── Admin ───────────

export async function startAdminSession(userId: string, version: number) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await sign("admin", userId, version, ADMIN_TTL), cookieOpts(ADMIN_TTL));
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin() {
  const t = await readToken((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
  if (!t) return null;
  const user = await db.adminUser.findUnique({ where: { id: t.sub }, include: { role: true } });
  if (!user || !user.active || user.sessionVersion !== t.v) return null;
  const permissions = (Array.isArray(user.role.permissions) ? user.role.permissions : []) as Permission[];
  return { id: user.id, name: user.name, email: user.email, role: user.role, partnerId: user.partnerId, permissions };
}
export type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/** For admin pages: redirect to login when signed out, to /admin/forbidden when lacking permission. */
export async function requireAdminPage(p?: Permission) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (p && !hasPermission(admin.permissions, p)) redirect("/admin/forbidden");
  return admin;
}

export class AuthError extends Error {
  constructor(message = "UNAUTHORIZED") { super(message); }
}

/** For server actions and API routes: throws instead of redirecting. */
export async function requireAdmin(p?: Permission) {
  const admin = await getAdmin();
  if (!admin) throw new AuthError("UNAUTHORIZED");
  if (p && !hasPermission(admin.permissions, p)) throw new AuthError("FORBIDDEN");
  return admin;
}

export const can = (admin: { permissions: unknown }, p: Permission) => hasPermission(admin.permissions, p);

// ─────────── Customer ───────────

export async function startCustomerSession(customerId: string, version: number) {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, await sign("customer", customerId, version, CUSTOMER_TTL), cookieOpts(CUSTOMER_TTL));
}

export async function endCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCustomer() {
  const t = await readToken((await cookies()).get(CUSTOMER_COOKIE)?.value, "customer");
  if (!t) return null;
  const c = await db.customer.findUnique({ where: { id: t.sub } });
  if (!c || c.status === "SUSPENDED" || c.status === "DELETED" || c.sessionVersion !== t.v) return null;
  return c;
}

export async function requireCustomerPage() {
  const c = await getCustomer();
  if (!c) redirect("/account/login");
  return c;
}
