import { z } from "zod";
import { fail, handle, json, parseBody } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";

const body = z.object({ productIds: z.array(z.string().min(1).max(40)).min(1).max(100) });

export const GET = handle(async () => {
  const c = await getCustomer();
  if (!c) return fail("UNAUTHORIZED", 401);
  const rows = await db.wishlistItem.findMany({ where: { customerId: c.id }, select: { productId: true } });
  return json({ productIds: rows.map((r) => r.productId) });
});

export const POST = handle(async (req: Request) => {
  const c = await getCustomer();
  if (!c) return fail("UNAUTHORIZED", 401);
  const b = await parseBody(req, body);
  if (!b.ok) return b.res;
  const existing = await db.product.findMany({ where: { id: { in: b.data.productIds } }, select: { id: true } });
  for (const p of existing) {
    await db.wishlistItem.upsert({
      where: { customerId_productId: { customerId: c.id, productId: p.id } },
      create: { customerId: c.id, productId: p.id },
      update: {},
    });
  }
  return json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const c = await getCustomer();
  if (!c) return fail("UNAUTHORIZED", 401);
  const b = await parseBody(req, body);
  if (!b.ok) return b.res;
  await db.wishlistItem.deleteMany({ where: { customerId: c.id, productId: { in: b.data.productIds } } });
  return json({ ok: true });
});
