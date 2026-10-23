import { z } from "zod";
import { fail, handle, json, limit, parseBody } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(120), locale: z.enum(["ar", "en"]).default("ar") });

export const POST = handle(async (req: Request) => {
  if (!(await limit("newsletter", 8, 10 * 60_000))) return fail("RATE_LIMITED", 429);
  const b = await parseBody(req, schema);
  if (!b.ok) return b.res;
  await db.newsletterSubscriber.upsert({ where: { email: b.data.email }, create: b.data, update: {} });
  return json({ ok: true });
});
