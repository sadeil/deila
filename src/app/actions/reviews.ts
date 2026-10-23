"use server";
import { z } from "zod";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  productId: z.string().min(1).max(40),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});

/** Only customers with a delivered order containing the product may review it. Reviews are moderated. */
export async function submitReview(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const c = await getCustomer();
  if (!c) return { ok: false, error: "UNAUTHORIZED" };
  if (!rateLimit(`review:${c.id}`, 5, 3600_000).ok) return { ok: false, error: "RATE_LIMITED" };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "TOO_SHORT" };
  const order = await db.order.findFirst({
    where: { customerId: c.id, status: "DELIVERED", items: { some: { productId: p.data.productId } } },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "FORBIDDEN" };
  await db.review.upsert({
    where: { customerId_productId: { customerId: c.id, productId: p.data.productId } },
    create: { productId: p.data.productId, customerId: c.id, orderId: order.id, rating: p.data.rating, body: p.data.body },
    update: { rating: p.data.rating, body: p.data.body, status: "PENDING" },
  });
  return { ok: true };
}
