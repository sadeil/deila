import { db } from "@/lib/db";
import { bestSellers, productsWhere } from "@/lib/catalog";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { asRecord, siteUrl } from "@/lib/utils";
import type { IconName } from "@/components/ui/Icon";
import { Hero } from "@/components/home/Hero";
import {
  CategoriesSection, CollectionsSection, NewsletterSection, OffersSection, ProductRail,
  ReviewsSection, SocialSection, SpotlightSection, StorySection, WhySection,
} from "@/components/home/Sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [t, settings, sections] = await Promise.all([
    getT(),
    getSettings(),
    db.homepageSection.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const l = t.locale;
  const s = (ar?: string | null, en?: string | null) => (l === "ar" ? ar : en) ?? "";
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const rendered = await Promise.all(
    sections.map(async (sec) => {
      const c = asRecord(sec.config);
      const title = s(sec.titleAr, sec.titleEn);
      const limit = typeof c.limit === "number" ? c.limit : 4;
      switch (sec.type) {
        case "HERO": {
          const slug = str(c.productSlug);
          const [featured] = slug ? await productsWhere({ slug }, 1) : await productsWhere({ featured: true }, 1);
          return (
            <Hero key={sec.id}
              eyebrow={s(str(c.eyebrowAr), str(c.eyebrowEn))}
              headline={title}
              body={s(str(c.bodyAr), str(c.bodyEn))}
              primary={{ label: s(str(c.primaryLabelAr), str(c.primaryLabelEn)) || t("تسوقي الآن", "Shop now"), href: str(c.primaryHref) || "/shop" }}
              secondary={{ label: s(str(c.secondaryLabelAr), str(c.secondaryLabelEn)) || t("اكتشفي المجموعة", "Discover"), href: str(c.secondaryHref) || "/shop" }}
              image={str(c.image) || "/brand/illustrations/styler.svg"}
              featured={featured ? { slug: featured.slug, name: s(featured.nameAr, featured.nameEn), price: featured.price, category: s(featured.categoryAr, featured.categoryEn) } : null}
            />
          );
        }
        case "CATEGORIES": {
          const cats = await db.category.findMany({
            where: { visible: true, archived: false }, orderBy: { sortOrder: "asc" },
            include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
          });
          return <CategoriesSection key={sec.id} l={l} title={title} categories={cats.map((x) => ({ ...x, count: x._count.products }))} />;
        }
        case "COLLECTIONS":
          return <CollectionsSection key={sec.id} l={l} title={title} items={Array.isArray(c.items) ? (c.items as never[]) : []} />;
        case "FEATURED":
          return <ProductRail key={sec.id} l={l} eyebrow={t("مختارات", "Featured")} title={title} href="/shop" items={await productsWhere({ featured: true }, limit)} />;
        case "NEW_ARRIVALS":
          return <ProductRail key={sec.id} l={l} eyebrow={t("جديدنا", "Just in")} title={title} href="/shop?sort=new" tone="blush" items={await productsWhere({ newArrival: true }, limit)} />;
        case "BEST_SELLERS":
          // Real sales only — the section stays hidden until orders exist.
          return <ProductRail key={sec.id} l={l} eyebrow={t("الأكثر مبيعاً", "Most loved")} title={title} href="/shop?sort=popular" items={await bestSellers(limit)} />;
        case "LIFESTYLE": {
          const slug = str(c.categorySlug) || "cute-tech";
          return <ProductRail key={sec.id} l={l} eyebrow={t("أسلوب حياة", "Lifestyle")} title={title} href={`/shop?category=${slug}`} items={await productsWhere({ category: { slug } }, limit)} />;
        }
        case "SPOTLIGHT": {
          const [p] = await productsWhere({ slug: str(c.productSlug) }, 1);
          return <SpotlightSection key={sec.id} l={l} title={title} body={s(str(c.bodyAr), str(c.bodyEn))} product={p ?? null} />;
        }
        case "STORY":
          return <StorySection key={sec.id} l={l} title={title} body={s(str(c.bodyAr), str(c.bodyEn))} image={str(c.image) || undefined} />;
        case "OFFERS":
          return <OffersSection key={sec.id} l={l} title={title} body={s(str(c.bodyAr), str(c.bodyEn))} code={str(c.code) || undefined} href={str(c.href) || undefined} />;
        case "WHY":
          return <WhySection key={sec.id} l={l} title={title} items={Array.isArray(c.items) ? (c.items as { icon: IconName; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }[]) : []} />;
        case "REVIEWS": {
          const reviews = await db.review.findMany({
            where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 3,
            include: { customer: { select: { name: true } }, product: { select: { nameAr: true, nameEn: true } } },
          });
          return <ReviewsSection key={sec.id} l={l} title={title} reviews={reviews.map((r) => ({
            id: r.id, rating: r.rating, body: r.body, name: r.customer.name.split(" ")[0], product: s(r.product.nameAr, r.product.nameEn),
          }))} />;
        }
        case "NEWSLETTER":
          return <NewsletterSection key={sec.id} l={l} title={title} body={s(str(c.bodyAr), str(c.bodyEn))} />;
        case "SOCIAL": {
          const so = settings.social;
          const links = ([
            ["instagram", so.instagram, "Instagram"], ["facebook", so.facebook, "Facebook"], ["tiktok", so.tiktok, "TikTok"], ["whatsapp", so.whatsapp, "WhatsApp"],
          ] as [IconName, string, string][]).filter(([, u]) => u).map(([icon, url, label]) => ({ icon, url, label }));
          return <SocialSection key={sec.id} l={l} title={title} links={links} />;
        }
        default:
          return null;
      }
    }),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DELLA",
    alternateName: "ديلا",
    url: siteUrl(),
    logo: siteUrl("/brand/della-avatar.svg"),
    slogan: "Gadgets Made for Her.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {rendered}
    </>
  );
}
