import { fail, handle, json } from "@/lib/api";
import { getProduct, toPurchaseVariants } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const GET = handle(async (req: Request) => {
  const slug = new URL(req.url).searchParams.get("slug")?.slice(0, 120);
  if (!slug) return fail("NOT_FOUND", 404);
  const [p, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!p) return fail("NOT_FOUND", 404);
  return json({
    id: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, shortAr: p.shortAr, shortEn: p.shortEn,
    image: p.images[0]?.url ?? null, altAr: p.images[0]?.altAr ?? null, altEn: p.images[0]?.altEn ?? null,
    compareAtPrice: p.compareAtPrice, priceVerified: p.priceVerified, isDemo: p.isDemo,
    variants: toPurchaseVariants(p.price, p.variants, settings.catalog.maxQtyPerItem),
  });
});
