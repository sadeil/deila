import "server-only";
import { ZodError } from "zod";
import { AuthError, requireAdmin, type AdminSession } from "./auth";
import type { Permission } from "./rbac";
import { OrderError } from "./services/orders";
import { fieldErrors } from "./validation";
import { Prisma } from "@prisma/client";

export type ActionResult = { ok?: boolean; error?: string; fields?: Record<string, string | undefined>; message?: string; id?: string } | undefined;

/**
 * Every admin mutation goes through here: the session and permission are re-checked
 * server-side on each call (UI hiding is never the only protection), and errors are
 * mapped to stable codes without leaking internals.
 */
export async function adminAction(
  perm: Permission,
  fn: (admin: AdminSession) => Promise<ActionResult | void>,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin(perm);
    return (await fn(admin)) ?? { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof OrderError) return { error: e.code };
    if (e instanceof ZodError) return { error: "VALIDATION", fields: fieldErrors(e) };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "DUPLICATE" };
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("[admin action]", e);
    return { error: "SERVER" };
  }
}

export const fd = (form: FormData) => Object.fromEntries(form) as Record<string, string>;
export const bool = (v: FormDataEntryValue | null | undefined) => v === "on" || v === "true" || v === "1";
