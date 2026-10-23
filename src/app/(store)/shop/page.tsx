import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getFacets, listProducts, type ShopQuery } from "@/lib/catalog";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters, SortSelect } from "@/components/store/ShopFilters";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const t = await getT();
  const slug = one(sp.category);
  const cat = slug ? await db.category.findUnique({ where: { slug } }) : null;
  const title = cat ? cat.seoTitle || (t.locale === "ar" ? cat.nameAr : cat.nameEn) : t("تسوّقي", "Shop");
  return {
    title,
    description: cat ? cat.seoDesc || (t.locale === "ar" ? cat.descAr : cat.descEn) || undefined : undefined,
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = await getT();
  const l = t.locale;
  const sort = one(sp.sort);
  const query: ShopQuery = {
    q: one(sp.q),
    category: one(sp.category),
    brand: one(sp.brand),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    availability: one(sp.availability) === "in_stock" ? "in_stock" : undefined,
    sort: (["new", "price_asc", "price_desc", "popular"] as const).find((s) => s === sort) ?? "featured",
    page: num(one(sp.page)) ?? 1,
  };
  const [result, facets, settings] = await Promise.all([listProducts(query), getFacets(), getSettings()]);
  const cat = facets.categories.find((c) => c.slug === query.category);
  const title = query.q ? t(`نتائج البحث عن “${query.q}”`, `Results for “${query.q}”`) : cat ? (l === "ar" ? cat.nameAr : cat.nameEn) : query.sort === "new" ? t("وصل حديثاً", "New arrivals") : query.sort === "popular" ? t("الأكثر طلباً", "Best sellers") : t("كل المنتجات", "Shop all");
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") u.set(k, v);
    if (p > 1) u.set("page", String(p));
    return `/shop?${u.toString()}`;
  };
  const filterFacets = { ...facets, categories: facets.categories.map((c) => ({ slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn, count: c._count.products })) };
  const hasDemo = result.items.some((p) => p.isDemo);

  return (
    <div className="container pb-24 pt-10 md:pt-14">
      <nav aria-label={t("مسار التنقل", "Breadcrumb")} className="mb-6 text-xs text-plum-500">
        <Link href="/" className="hover:text-plum">{t("الرئيسية", "Home")}</Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-plum">{t("تسوّقي", "Shop")}</Link>
        {cat && <><span className="mx-2">/</span><span className="text-plum">{l === "ar" ? cat.nameAr : cat.nameEn}</span></>}
      </nav>
      <header className="mb-10 flex flex-col gap-3 border-b border-ivory-200 pb-8 md:mb-12">
        <h1 className="display text-display-lg">{title}</h1>
        {cat && (l === "ar" ? cat.descAr : cat.descEn) && <p className="max-w-xl text-plum-600">{l === "ar" ? cat.descAr : cat.descEn}</p>}
      </header>

      {hasDemo && settings.catalog.showDemoNotice && (
        <p className="mb-8 flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4 text-sm text-gold-700">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          {t("بعض المنتجات المعروضة تجريبية: الأسعار والصور والمواصفات توضيحية وقيد التحقق مع الشريك التجاري قبل الإطلاق.",
            "Some products shown are demo entries: prices, images and specifications are illustrative and being verified with our retail partner before launch.")}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        <Suspense><ShopFilters mode="sidebar" facets={filterFacets} /></Suspense>
        <div>
          <div className="mb-8 flex items-center justify-between gap-4">
            <Suspense><ShopFilters mode="mobile" facets={filterFacets} /></Suspense>
            <p className="hidden text-sm text-plum-500 lg:block" aria-live="polite">{t(`${result.total} منتج`, `${result.total} ${result.total === 1 ? "product" : "products"}`)}</p>
            <Suspense><SortSelect /></Suspense>
          </div>

          {result.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-ivory-100 px-6 py-20 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-blush"><Icon name="search" className="h-6 w-6" /></span>
              <h2 className="display mt-6 text-2xl">{t("لم نجد منتجات مطابقة", "No matching products")}</h2>
              <p className="mt-2 max-w-sm text-sm text-plum-600">{t("جرّبي تغيير الفلاتر أو البحث بكلمة أخرى.", "Try adjusting the filters or searching for something else.")}</p>
              <Link href="/shop" className="btn-primary mt-8">{t("عرض كل المنتجات", "View all products")}</Link>
            </div>
          ) : (
            <Stagger key={JSON.stringify(query)} className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
              {result.items.map((p, i) => <StaggerItem key={p.id}><ProductCard p={p} priority={i < 3} /></StaggerItem>)}
            </Stagger>
          )}

          {result.pages > 1 && (
            <nav className="mt-16 flex items-center justify-center gap-2" aria-label={t("الصفحات", "Pagination")}>
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={pageHref(p)} aria-current={p === result.page ? "page" : undefined}
                  className={cn("grid h-10 w-10 place-items-center rounded-full text-sm tabular-nums transition", p === result.page ? "bg-plum text-ivory" : "hover:bg-plum/5")}>{p}</Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
