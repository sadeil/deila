import { z } from "zod";
import { fail, handle, json, limit, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/services/notifications";
import { phoneSchema } from "@/lib/validation";

const schema = z
  .object({
    name: z.string().trim().min(2, "REQUIRED").max(80),
    phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
    email: z.string().trim().email("INVALID_EMAIL").max(120).optional().or(z.literal("").transform(() => undefined)),
    message: z.string().trim().min(5, "TOO_SHORT").max(2000),
    website: z.string().max(0).optional(), // honeypot
  })
  .refine((v) => v.phone || v.email, { message: "REQUIRED", path: ["phone"] });

export const POST = handle(async (req: Request) => {
  if (!(await limit("contact", 5, 10 * 60_000))) return fail("RATE_LIMITED", 429);
  const b = await parseBody(req, schema);
  if (!b.ok) return b.res;
  const { name, phone, email, message } = b.data;
  const inq = await db.inquiry.create({ data: { name, phone, email, message } });
  await notifyAdmins("NEW_INQUIRY", `New inquiry from ${name}`, message.slice(0, 200));
  return json({ ok: true, id: inq.id });
});
