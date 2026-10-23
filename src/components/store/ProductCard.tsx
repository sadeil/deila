"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import type { ProductCardData } from "@/lib/catalog";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";
import { Price } from "./Price";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { useQuickView } from "./QuickView";

export function ProductCard({ p, priority = false, tone = "ivory" }: { p: ProductCardData; priority?: boolean; tone?: "ivory" | "blush" }) {
  const t = useT();
  const l = t.locale;
  const { add } = useCart();
  const wish = useWishlist();
  const qv = useQuickView();
  const [hover, setHover] = useState(false);
  const name = l === "ar" ? p.nameAr : p.nameEn;
  const wished = wish.has(p.id);

  const quickAdd = () => {
    if (p.variantCount > 1) return qv.open(p.slug);
    if (!p.defaultVariantId) return;
    add(p.defaultVariantId, 1, { slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, image: p.image, unitPrice: p.price });
  };

  return (
    <article className="group relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className={cn("relative aspect-[4/5] overflow-hidden rounded-2xl", tone === "blush" ? "bg-blush-50" : "bg-ivory-100")}>
        <Link href={`/product/${p.slug}`} className="absolute inset-0" aria-label={name}>
          {p.image ? (
            <>
              <Image src={p.image} alt={(l === "ar" ? p.altAr : p.altEn) ?? name} fill priority={priority}
                sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw"
                className={cn("object-cover transition duration-[1.2s] ease-lux", hover && !p.image2 && "scale-[1.04]", p.image2 && hover && "opacity-0")} />
              {p.image2 && (
                <Image src={p.image2} alt="" fill sizes="(min-width:1280px) 22vw, 46vw"
                  className={cn("object-cover opacity-0 transition duration-700 ease-lux", hover && "opacity-100 scale-[1.02]")} />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-plum-400"><Icon name="sparkle" className="h-10 w-10" /></div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {p.newArrival && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-plum backdrop-blur">{t("جديد", "New")}</span>}
            {p.compareAtPrice && <span className="rounded-full bg-plum px-2.5 py-1 text-[10px] font-semibold tracking-wide text-ivory">{t("عرض", "Sale")}</span>}
            {p.soldOut && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-plum-500">{t("نفد المخزون", "Sold out")}</span>}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => wish.toggle(p.id)}
          aria-pressed={wished}
          aria-label={wished ? t("إزالة من المفضلة", "Remove from wishlist") : t("أضيفي للمفضلة", "Add to wishlist")}
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-plum backdrop-blur transition hover:bg-white"
        >
          <Icon name="heart" className={cn("h-[18px] w-[18px] transition", wished && "fill-plum")} />
        </motion.button>

        <div className="absolute inset-x-3 bottom-3 flex gap-2 transition duration-500 ease-lux md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
          <button type="button" onClick={quickAdd} disabled={p.soldOut}
            className="btn btn-sm h-10 flex-1 bg-plum/95 text-ivory backdrop-blur hover:bg-plum">
            <Icon name="bag" className="h-4 w-4" />
            {p.soldOut ? t("غير متوفر", "Unavailable") : p.variantCount > 1 ? t("اختاري اللون", "Choose option") : t("أضيفي للسلة", "Add to bag")}
          </button>
          <button type="button" onClick={() => qv.open(p.slug)} aria-label={t("نظرة سريعة", "Quick view")}
            className="btn btn-sm hidden h-10 w-10 bg-white/90 px-0 text-plum backdrop-blur hover:bg-white md:inline-flex">
            <Icon name="eye" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[.16em] text-plum-500 [html[lang=ar]_&]:tracking-normal">
          {l === "ar" ? p.categoryAr : p.categoryEn}
        </p>
        <h3 className="text-[15px] font-medium leading-snug">
          <Link href={`/product/${p.slug}`} className="link-underline">{name}</Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Price amount={p.price} compareAt={p.compareAtPrice} locale={l} size="sm" />
          {!p.priceVerified && <span className="text-[11px] text-plum-500">{t("· السعر قيد التأكيد", "· Price pending verification")}</span>}
        </div>
        {p.swatches.length > 1 && (
          <div className="flex gap-1.5 pt-1" aria-label={t("الألوان المتاحة", "Available colours")}>
            {p.swatches.slice(0, 5).map((s) => (
              <span key={s.id} title={l === "ar" ? s.nameAr : s.nameEn} className="h-3.5 w-3.5 rounded-full ring-1 ring-plum/20 ring-offset-1 ring-offset-ivory" style={{ background: s.colorHex ?? undefined }} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-2xl" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
    </div>
  );
}
