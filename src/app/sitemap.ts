import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { visible: true, archived: false }, select: { slug: true, updatedAt: true } }),
    db.contentPage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/about"), priority: 0.5 },
    { url: siteUrl("/contact"), priority: 0.4 },
    ...categories.map((c) => ({ url: siteUrl(`/shop?category=${c.slug}`), lastModified: c.updatedAt, priority: 0.8 })),
    ...products.map((p) => ({ url: siteUrl(`/product/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
    ...pages.filter((p) => p.slug !== "about").map((p) => ({ url: siteUrl(`/pages/${p.slug}`), lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
