import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AuthError } from "./auth";
import { rateLimit } from "./rate-limit";
import { clientIp } from "./request";
import { fieldErrors } from "./validation";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

export async function limit(name: string, max: number, windowMs: number) {
  const ip = await clientIp();
  return rateLimit(`${name}:${ip}`, max, windowMs).ok;
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<{ ok: true; data: z.output<S> } | { ok: false; res: NextResponse }> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return { ok: false, res: fail("UNSUPPORTED_MEDIA_TYPE", 415) };
  let raw: unknown;
  try { raw = await req.json(); } catch { return { ok: false, res: fail("INVALID_JSON") }; }
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, res: fail("VALIDATION", 422, { fields: fieldErrors(r.error) }) };
  return { ok: true, data: r.data };
}

/** Wraps a route handler with consistent error mapping (never leaks internals). */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) return fail(e.message, e.message === "FORBIDDEN" ? 403 : 401);
      if (e instanceof ZodError) return fail("VALIDATION", 422, { fields: fieldErrors(e) });
      console.error("[api]", e);
      return fail("SERVER", 500);
    }
  };
}
