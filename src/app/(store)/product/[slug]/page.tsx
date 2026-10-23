import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, productsWhere, toPurchaseVariants } from "@/lib/catalog";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { asSpecs, asStringArray, cn, siteUrl } from "@/lib/utils";
import { Gallery } from "@/components/product/Gallery";
import { ReviewForm } from "@/components/product/ReviewForm";
import { ShareButton } from "@/components/product/ShareButton";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { ProductRail } from "@/components/home/Sections";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [p, t] = await Promise.all([getProduct(slug), getT()]);
  if (!p) return { title: t("غير موجود", "Not found") };
  const name = t.locale === "ar" ? p.nameAr : p.nameEn;
  const description = p.seoDesc || (t.locale === "ar" ? p.shortAr : p.shortEn) || undefined;
  return {
    title: p.seoTitle || name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: name, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [p, t, settings, customer] = await Promise.all([getProduct(slug), getT(), getSettings(), getCustomer()]);
  if (!p) notFound();
  const l = t.locale;
  const s = (ar?: string | null, en?: string | null) => (l === "ar" ? ar : en) ?? "";
  const name = s(p.nameAr, p.nameEn);
  const variants = toPurchaseVariants(p.price, p.variants, settings.catalog.maxQtyPerItem);
  const features = l === "ar" ? asStringArray(p.featuresAr) : asStringArray(p.featuresEn);
  const specs = asSpecs(p.specs);
  const images = p.images.map((im) => ({ url: im.url, alt: s(im.altAr, im.altEn) || name }));
  const purchaseProduct = { id: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, image: p.images[0]?.url ?? null, compareAtPrice: p.compareAtPrice, priceVerified: p.priceVerified };
  const related = (await productsWhere({ categoryId: p.categoryId, id: { not: p.id } }, 4)).concat(
    await productsWhere({ categoryId: { not: p.categoryId }, featured: true }, 4),
  ).slice(0, 4);
  const zones = await db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const canReview = customer
    ? !!(await db.order.findFirst({ where: { customerId: customer.id, status: "DELIVERED", items: { some: { productId: p.id } } }, select: { id: true } }))
    : false;
  const avg = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : 0;
  const def = variants.find((v) => v.isDefault) ?? variants[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.sku,
    description: s(p.shortAr, p.shortEn),
    image: p.images.map((i) => siteUrl(i.url)),
    brand: p.brand ? { "@type": "Brand", name: p.brand.nameEn } : undefined,
    category: s(p.category.nameAr, p.category.nameEn),
    // Offers are only published for verified prices.
    offers: p.priceVerified && def ? {
      "@type": "Offer", priceCurrency: "ILS", price: (def.price / 100).toFixed(2), url: siteUrl(`/product/${p.slug}`),
      availability: def.availability === "IN_STOCK" ? "https://schema.org/InStock" : def.availability === "OUT_OF_STOCK" ? "https://schema.org/OutOfStock" : "https://schema.org/PreOrder",
    } : undefined,
    aggregateRating: p.reviews.length ? { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: p.reviews.length } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container pb-16 pt-6 md:pt-10">
        <nav aria-label={t("مسار التنقل", "Breadcrumb")} className="mb-6 hidden text-xs text-plum-500 md:block">
          <Link href="/" className="hover:text-plum">{t("الرئيسية", "Home")}</Link><span className="mx-2">/</span>
          <Link href={`/shop?category=${p.category.slug}`} className="hover:text-plum">{s(p.category.nameAr, p.category.nameEn)}</Link><span className="mx-2">/</span>
          <span className="text-plum">{name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Gallery images={images} videoUrl={p.videoUrl} isIllustration={p.images.every((i) => i.url.startsWith("/brand/illustrations/"))} />
          </div>

          <div className="space-y-8">
            <Reveal>
              {p.isDemo && (
                <p className="mb-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold-700">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("منتج تجريبي: السعر والمواصفات والضمان قيد التحقق مع الشريك التجاري. سنؤكد كل التفاصيل معك قبل التوصيل.",
                    "Demo product: price, specifications and warranty are being verified with our retail partner. We'll confirm every detail with you before delivery.")}
                </p>
              )}
              <p className="eyebrow mb-3">{s(p.category.nameAr, p.category.nameEn)}{p.brand && ` · ${s(p.brand.nameAr, p.brand.nameEn)}`}</p>
              <h1 className="display text-display-md">{name}</h1>
              {p.model && <p className="mt-2 text-sm text-plum-500">{t("الموديل:", "Model:")} <span dir="ltr">{p.model}</span></p>}
              {p.reviews.length > 0 && (
                <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
                  <span className="flex text-gold">{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" className={cn("h-4 w-4", i < Math.round(avg) && "fill-gold")} />)}</span>
                  <span className="text-plum-600">{avg.toFixed(1)} · {p.reviews.length} {t("مراجعة", "reviews")}</span>
                </a>
              )}
              <p className="mt-5 text-[17px] leading-relaxed text-plum-600">{s(p.shortAr, p.shortEn)}</p>
            </Reveal>

            <div id="purchase"><ProductPurchase product={purchaseProduct} variants={variants} /></div>

            <ul className="grid gap-3 rounded-2xl bg-ivory-100 p-5 text-sm">
              <li className="flex gap-3">
                <Icon name="truck" className="h-5 w-5 text-gold-600" />
                <span>
                  <span className="font-semibold">{t("التوصيل", "Delivery")}: </span>
                  {zones.length ? t(`متاح لمناطق مختارة خلال ${Math.min(...zones.map((z) => z.etaMinDays))}–${Math.max(...zones.map((z) => z.etaMaxDays))} أيام عمل. تُحسب الرسوم عند الدفع.`,
                    `Available to selected areas within ${Math.min(...zones.map((z) => z.etaMinDays))}–${Math.max(...zones.map((z) => z.etaMaxDays))} business days. Fees are calculated at checkout.`)
                    : t("يُرجى التواصل معنا لترتيب التوصيل.", "Please contact us to arrange delivery.")}
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="shield" className="h-5 w-5 text-gold-600" />
                <span><span className="font-semibold">{t("الضمان", "Warranty")}: </span>{s(p.warrantyAr, p.warrantyEn) || t("تفاصيل الضمان تُؤكَّد عند الطلب.", "Warranty details are confirmed when ordering.")}</span>
              </li>
              <li className="flex gap-3">
                <Icon name="package" className="h-5 w-5 text-gold-600" />
                <span><span className="font-semibold">{t("الاسترجاع", "Returns")}: </span>
                  {p.returnEligible ? t("قابل للاسترجاع وفق ", "Eligible for return under our ") : t("غير قابل للاسترجاع لأسباب صحية — راجعي ", "Not returnable for hygiene reasons — see our ")}
                  <Link href="/pages/returns" className="underline underline-offset-2">{t("سياسة الاسترجاع", "returns policy")}</Link>.
                </span>
              </li>
              {settings.payments.codEnabled && (
                <li className="flex gap-3"><Icon name="cash" className="h-5 w-5 text-gold-600" /><span>{t("الدفع عند الاستلام متاح في المناطق المدعومة.", "Cash on delivery available in supported areas.")}</span></li>
              )}
            </ul>

            <div className="divide-y divide-ivory-200 border-y border-ivory-200">
              <details className="group py-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{t("الوصف", "Description")}<Icon name="plus" className="h-4 w-4 transition group-open:rotate-45" /></summary>
                <div className="mt-4 space-y-4 leading-relaxed text-plum-600">
                  <p className="whitespace-pre-line">{s(p.descAr, p.descEn)}</p>
                  {features.length > 0 && (
                    <ul className="space-y-2">
                      {features.map((f, i) => <li key={i} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />{f}</li>)}
                    </ul>
                  )}
                </div>
              </details>
              {specs.length > 0 && (
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{t("المواصفات الفنية", "Specifications")}<Icon name="plus" className="h-4 w-4 transition group-open:rotate-45" /></summary>
                  <dl className="mt-4 divide-y divide-ivory-200 text-sm">
                    {specs.map((sp, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-3">
                        <dt className="text-plum-500">{s(sp.labelAr, sp.labelEn)}</dt>
                        <dd className="font-medium">{s(sp.valueAr, sp.valueEn)}</dd>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-4 py-3"><dt className="text-plum-500">SKU</dt><dd className="font-medium" dir="ltr">{p.sku}</dd></div>
                  </dl>
                </details>
              )}
            </div>
            <ShareButton title={name} />
          </div>
        </div>

        <section id="reviews" className="mt-20 scroll-mt-24 border-t border-ivory-200 pt-14">
          <h2 className="display text-display-sm">{t("مراجعات موثّقة", "Verified reviews")}</h2>
          {p.reviews.length === 0 ? (
            <p className="mt-4 text-sm text-plum-500">{t("لا توجد مراجعات بعد. تُنشر المراجعات فقط من عميلات استلمن المنتج.", "No reviews yet. Reviews are published only from customers who received the product.")}</p>
          ) : (
            <ul className="mt-8 grid gap-5 md:grid-cols-2">
              {p.reviews.map((r) => (
                <li key={r.id} className="card p-6">
                  <div className="flex text-gold">{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" className={cn("h-4 w-4", i < r.rating && "fill-gold")} />)}</div>
                  <p className="mt-3 leading-relaxed">{r.body}</p>
                  <p className="mt-4 text-sm font-semibold">{r.customer.name.split(" ")[0]} <span className="font-normal text-success">· {t("مشترية موثّقة", "Verified buyer")}</span></p>
                </li>
              ))}
            </ul>
          )}
          {canReview && <div className="mt-8 max-w-xl"><ReviewForm productId={p.id} /></div>}
        </section>
      </div>

      <ProductRail l={l} eyebrow={t("قد يعجبك أيضاً", "You may also like")} title={t("منتجات ذات صلة", "Related products")} items={related} tone="blush" />
      <StickyBuyBar product={purchaseProduct} variants={variants} />
    </>
  );
}
