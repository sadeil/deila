import { fail, handle, json, limit } from "@/lib/api";
import { listProducts } from "@/lib/catalog";

export const GET = handle(async (req: Request) => {
  if (!(await limit("suggest", 90, 60_000))) return fail("RATE_LIMITED", 429);
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return json({ items: [] });
  const { items } = await listProducts({ q, sort: "featured" });
  return json({ items: items.slice(0, 6).map((p) => ({ slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, image: p.image, price: p.price })) });
});
