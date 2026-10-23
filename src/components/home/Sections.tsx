import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "../ui/Icon";
import { Reveal, Stagger, StaggerItem } from "../ui/Reveal";
import { ProductCard } from "../store/ProductCard";
import { NewsletterForm } from "../store/NewsletterForm";
import { CopyCode } from "./CopyCode";

const pick = (l: Locale, ar?: string | null, en?: string | null) => (l === "ar" ? ar : en) ?? "";

export function SectionHeading({ eyebrow, title, href, linkLabel, align = "split" }: {
  eyebrow?: string; title: string; href?: string; linkLabel?: string; align?: "split" | "center";
}) {
  return (
    <Reveal className={cn("mb-10 flex gap-6 md:mb-14", align === "center" ? "flex-col items-center text-center" : "items-end justify-between")}>
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="display text-display-md">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-2 text-sm font-semibold link-underline sm:inline-flex">
          {linkLabel}<Icon name="arrow" className="h-4 w-4 flip-rtl" />
        </Link>
      )}
    </Reveal>
  );
}

export function CategoriesSection({ l, title, categories }: {
  l: Locale; title: string; categories: { slug: string; nameAr: string; nameEn: string; image: string | null; count: number }[];
}) {
  if (!categories.length) return null;
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <SectionHeading eyebrow={l === "ar" ? "الفئات" : "Categories"} title={title} href="/shop" linkLabel={l === "ar" ? "كل المنتجات" : "Shop all"} />
      </div>
      <Stagger className="container flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-5 md:gap-6 md:overflow-visible">
        {categories.map((c) => (
          <StaggerItem key={c.slug} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
            <Link href={`/shop?category=${c.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-arch bg-blush-50">
                {c.image && <Image src={c.image} alt="" fill sizes="(min-width:768px) 18vw, 60vw" className="object-cover transition duration-[1.2s] ease-lux group-hover:scale-105" />}
              </div>
              <div className="mt-4 flex items-start justify-between gap-2">
                <p className="display text-lg leading-snug">{pick(l, c.nameAr, c.nameEn)}</p>
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-plum/15 transition group-hover:bg-plum group-hover:text-ivory">
                  <Icon name="arrow" className="h-3.5 w-3.5 flip-rtl" />
                </span>
              </div>
              <p className="text-xs text-plum-500">{c.count} {l === "ar" ? "منتج" : c.count === 1 ? "product" : "products"}</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

type CollectionItem = { titleAr: string; titleEn: string; href: string; image: string };
export function CollectionsSection({ l, title, items }: { l: Locale; title: string; items: CollectionItem[] }) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  return (
    <section className="bg-ivory-100 py-16 md:py-24">
      <div className="container">
        <SectionHeading eyebrow={l === "ar" ? "مختارات" : "Curated"} title={title} />
        <div className="grid gap-5 md:grid-cols-[1.25fr_1fr] md:gap-6">
          <Reveal>
            <CollectionTile l={l} item={first} tall />
          </Reveal>
          <div className="grid gap-5 md:gap-6">
            {rest.slice(0, 2).map((it, i) => (
              <Reveal key={it.href} delay={0.1 * (i + 1)}><CollectionTile l={l} item={it} /></Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionTile({ l, item, tall }: { l: Locale; item: CollectionItem; tall?: boolean }) {
  return (
    <Link href={item.href} className={cn("group relative block overflow-hidden rounded-3xl bg-blush", tall ? "aspect-[4/5] md:aspect-auto md:h-full md:min-h-[560px]" : "aspect-[16/10]")}>
      <Image src={item.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-[1.4s] ease-lux group-hover:scale-[1.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-plum/55 via-plum/0 to-transparent" />
      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between text-ivory md:inset-x-8 md:bottom-8">
        <h3 className="display text-display-sm">{pick(l, item.titleAr, item.titleEn)}</h3>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-ivory text-plum transition group-hover:scale-110"><Icon name="arrow" className="h-4 w-4 flip-rtl" /></span>
      </div>
    </Link>
  );
}

export function ProductRail({ l, eyebrow, title, href, items, tone = "ivory" }: {
  l: Locale; eyebrow?: string; title: string; href?: string; items: ProductCardData[]; tone?: "ivory" | "blush";
}) {
  if (!items.length) return null;
  return (
    <section className={cn("py-16 md:py-24", tone === "blush" && "bg-blush-50")}>
      <div className="container">
        <SectionHeading eyebrow={eyebrow} title={title} href={href} linkLabel={l === "ar" ? "عرض الكل" : "View all"} />
        <Stagger className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {items.map((p) => <StaggerItem key={p.id}><ProductCard p={p} tone={tone === "blush" ? "ivory" : "blush"} /></StaggerItem>)}
        </Stagger>
        {href && (
          <div className="mt-10 text-center sm:hidden">
            <Link href={href} className="btn-secondary">{l === "ar" ? "عرض الكل" : "View all"}</Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function SpotlightSection({ l, title, body, product }: { l: Locale; title: string; body: string; product: ProductCardData | null }) {
  if (!product) return null;
  return (
    <section className="relative overflow-hidden bg-plum py-20 text-ivory md:py-28">
      <div className="pointer-events-none absolute -start-32 bottom-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" aria-hidden />
      <div className="container grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <Reveal className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-[4/5] overflow-hidden rounded-arch bg-blush">
            {product.image && <Image src={product.image} alt={pick(l, product.altAr, product.altEn)} fill sizes="(min-width:768px) 40vw, 90vw" className="object-cover" />}
          </div>
          <div className="absolute -end-4 -top-4 h-24 w-24 rounded-full border border-gold/50" aria-hidden />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="eyebrow !text-gold mb-5">{l === "ar" ? "تحت الضوء" : "In the spotlight"}</p>
          <h2 className="display text-display-lg">{title}</h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ivory/75">{body}</p>
          <div className="mt-8 border-t border-ivory/15 pt-6">
            <p className="text-sm text-ivory/60">{pick(l, product.categoryAr, product.categoryEn)}</p>
            <p className="display mt-1 text-2xl">{pick(l, product.nameAr, product.nameEn)}</p>
          </div>
          <Link href={`/product/${product.slug}`} className="btn mt-8 h-[52px] bg-ivory px-8 text-plum hover:bg-blush">
            {l === "ar" ? "اكتشفي الجهاز" : "Discover the device"}<Icon name="arrow" className="h-4 w-4 flip-rtl" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function StorySection({ l, title, body, image }: { l: Locale; title: string; body: string; image?: string }) {
  return (
    <section className="py-20 md:py-32">
      <div className="container grid items-center gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
        {image && (
          <Reveal className="order-last md:order-first">
            <div className="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-full bg-blush">
              <Image src={image} alt="" fill sizes="(min-width:768px) 30vw, 80vw" className="object-cover" />
            </div>
          </Reveal>
        )}
        <Reveal delay={0.1}>
          <p className="eyebrow mb-5 flex items-center gap-3"><span className="h-px w-10 bg-gold" />{l === "ar" ? "حكايتنا" : "Our story"}</p>
          <h2 className="display text-display-lg">{title}</h2>
          <p className="display mt-8 text-display-sm font-normal leading-relaxed text-plum-600">{body}</p>
          <Link href="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold link-underline">
            {l === "ar" ? "اقرئي المزيد عن ديلا" : "More about DELLA"}<Icon name="arrow" className="h-4 w-4 flip-rtl" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function OffersSection({ l, title, body, code, href }: { l: Locale; title: string; body: string; code?: string; href?: string }) {
  return (
    <section className="py-10 md:py-16">
      <div className="container">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-blush px-6 py-14 text-center md:px-16 md:py-20">
          <div className="pointer-events-none absolute -start-10 -top-10 h-48 w-48 rounded-full border border-plum/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -end-8 h-64 w-64 rounded-full border border-gold/40" aria-hidden />
          <p className="eyebrow mb-4">{l === "ar" ? "عرض خاص" : "Special offer"}</p>
          <h2 className="display text-display-md">{title}</h2>
          <p className="mx-auto mt-4 max-w-lg text-plum-600">{body}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {code && <CopyCode code={code} />}
            {href && <Link href={href} className="btn-primary">{l === "ar" ? "تسوقي العرض" : "Shop the offer"}</Link>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

type WhyItem = { icon: IconName; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string };
export function WhySection({ l, title, items }: { l: Locale; title: string; items: WhyItem[] }) {
  if (!items.length) return null;
  return (
    <section className="border-y border-ivory-200 py-16 md:py-24">
      <div className="container">
        <SectionHeading title={title} align="center" />
        <Stagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <StaggerItem key={i} className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blush-50 text-plum ring-1 ring-gold/30">
                <Icon name={it.icon} className="h-6 w-6" />
              </span>
              <h3 className="display mt-5 text-xl">{pick(l, it.titleAr, it.titleEn)}</h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-plum-600">{pick(l, it.bodyAr, it.bodyEn)}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ReviewsSection({ l, title, reviews }: {
  l: Locale; title: string; reviews: { id: string; rating: number; body: string; name: string; product: string }[];
}) {
  // Only genuine, approved, verified-purchase reviews are shown. No reviews → no section.
  if (!reviews.length) return null;
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <SectionHeading eyebrow={l === "ar" ? "مشتريات موثّقة" : "Verified purchases"} title={title} />
        <Stagger className="grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <StaggerItem key={r.id} className="card p-7">
              <div className="flex gap-0.5 text-gold" aria-label={`${r.rating}/5`}>
                {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" className={cn("h-4 w-4", i < r.rating && "fill-gold")} />)}
              </div>
              <p className="mt-4 leading-relaxed">“{r.body}”</p>
              <p className="mt-5 text-sm font-semibold">{r.name}</p>
              <p className="text-xs text-plum-500">{r.product}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function NewsletterSection({ l, title, body }: { l: Locale; title: string; body: string }) {
  return (
    <section className="py-16 md:py-24">
      <Reveal className="container flex flex-col items-center text-center">
        <span className="text-2xl text-gold" aria-hidden>✦</span>
        <h2 className="display mt-4 text-display-md">{title}</h2>
        <p className="mt-3 max-w-md text-plum-600">{body}</p>
        <div className="mt-8 flex w-full justify-center"><NewsletterForm /></div>
        <p className="sr-only">{l}</p>
      </Reveal>
    </section>
  );
}

export function SocialSection({ l, title, links }: { l: Locale; title: string; links: { icon: IconName; url: string; label: string }[] }) {
  if (!links.length) return null;
  return (
    <section className="pb-16 md:pb-24">
      <Reveal className="container flex flex-col items-center gap-6 text-center">
        <p className="eyebrow">{l === "ar" ? "@ديلا" : "@della"}</p>
        <h2 className="display text-display-sm">{title}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {links.map((s) => (
            <a key={s.icon} href={s.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <Icon name={s.icon} className="h-4 w-4" />{s.label}
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
