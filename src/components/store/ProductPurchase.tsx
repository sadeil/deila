"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { availabilityLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";
import { Price } from "./Price";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";

export type PurchaseVariant = {
  id: string;
  nameAr: string;
  nameEn: string;
  colorHex: string | null;
  price: number;
  isDefault: boolean;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNVERIFIED";
  verified: boolean;
  maxQty: number; // 0 = cannot be purchased
  lowStock: boolean;
};
export type PurchaseProduct = {
  id: string; slug: string; nameAr: string; nameEn: string; image: string | null;
  compareAtPrice: number | null; priceVerified: boolean;
};

export function ProductPurchase({ product, variants, compact = false, onAdded, onVariantChange }: {
  product: PurchaseProduct; variants: PurchaseVariant[]; compact?: boolean; onAdded?: () => void; onVariantChange?: (id: string) => void;
}) {
  const t = useT();
  const l = t.locale;
  const router = useRouter();
  const { add } = useCart();
  const wish = useWishlist();
  const initial = variants.find((v) => v.isDefault && v.maxQty > 0) ?? variants.find((v) => v.maxQty > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(initial?.id);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const v = useMemo(() => variants.find((x) => x.id === variantId) ?? variants[0], [variants, variantId]);
  const showPicker = variants.length > 1;
  const canBuy = !!v && v.maxQty > 0;

  const doAdd = (buyNow = false) => {
    if (!v || !canBuy) return;
    add(v.id, qty, {
      slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn,
      variantNameAr: showPicker ? v.nameAr : null, variantNameEn: showPicker ? v.nameEn : null,
      image: product.image, unitPrice: v.price,
    });
    onAdded?.();
    if (buyNow) router.push("/checkout");
    else { setJustAdded(true); setTimeout(() => setJustAdded(false), 1800); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Price amount={v?.price ?? 0} compareAt={product.compareAtPrice} locale={l} size="lg" />
        {!product.priceVerified && (
          <span className="chip border-gold/40 bg-gold/10 text-gold-700">{t("السعر قيد التأكيد مع الشريك", "Price pending partner verification")}</span>
        )}
      </div>

      {showPicker && (
        <fieldset>
          <legend className="mb-3 text-sm">
            <span className="text-plum-500">{t("اللون / الخيار:", "Colour / option:")}</span>{" "}
            <span className="font-semibold">{l === "ar" ? v?.nameAr : v?.nameEn}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((x) => {
              const active = x.id === variantId;
              const disabled = x.maxQty === 0;
              return x.colorHex ? (
                <button key={x.id} type="button" onClick={() => { setVariantId(x.id); setQty(1); onVariantChange?.(x.id); }}
                  aria-pressed={active} aria-label={l === "ar" ? x.nameAr : x.nameEn} title={l === "ar" ? x.nameAr : x.nameEn}
                  className={cn("relative h-10 w-10 rounded-full ring-1 ring-plum/20 ring-offset-[3px] ring-offset-ivory transition", active && "ring-2 ring-plum", disabled && "opacity-40")}
                  style={{ background: x.colorHex }}>
                  {disabled && <span className="absolute inset-0 m-auto h-px w-full rotate-45 bg-plum/60" />}
                </button>
              ) : (
                <button key={x.id} type="button" onClick={() => { setVariantId(x.id); setQty(1); onVariantChange?.(x.id); }} aria-pressed={active}
                  className={cn("h-10 rounded-full border px-4 text-sm transition", active ? "border-plum bg-plum text-ivory" : "border-ivory-300 hover:border-plum", disabled && "opacity-40 line-through")}>
                  {l === "ar" ? x.nameAr : x.nameEn}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {v && (
        <p className={cn("flex items-center gap-2 text-sm", v.availability === "OUT_OF_STOCK" ? "text-danger" : v.availability === "IN_STOCK" && v.verified ? "text-success" : "text-plum-500")}>
          <span className={cn("h-2 w-2 rounded-full", v.availability === "OUT_OF_STOCK" ? "bg-danger" : v.availability === "IN_STOCK" && v.verified ? "bg-success" : "bg-gold")} />
          {v.availability === "IN_STOCK" && !v.verified ? availabilityLabel(l, "UNVERIFIED") : availabilityLabel(l, v.availability)}
          {v.lowStock && v.availability === "IN_STOCK" && <span className="text-plum-500">· {t("كمية محدودة", "Limited quantity")}</span>}
        </p>
      )}

      <div className={cn("flex flex-col gap-3", !compact && "sm:flex-row")}>
        <div className="flex h-12 items-center rounded-full border border-ivory-300 bg-white/70" role="group" aria-label={t("الكمية", "Quantity")}>
          <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t("إنقاص", "Decrease")}><Icon name="minus" className="h-4 w-4" /></button>
          <output className="w-8 text-center tabular-nums font-semibold" aria-live="polite">{qty}</output>
          <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.min(v?.maxQty || 1, q + 1))} disabled={!canBuy || qty >= (v?.maxQty ?? 1)} aria-label={t("زيادة", "Increase")}><Icon name="plus" className="h-4 w-4" /></button>
        </div>
        <button type="button" className="btn-primary flex-1 relative overflow-hidden" onClick={() => doAdd(false)} disabled={!canBuy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={justAdded ? "ok" : "add"} className="inline-flex items-center gap-2"
              initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.25 }}>
              <Icon name={justAdded ? "check" : "bag"} className="h-4 w-4" />
              {!canBuy ? t("غير متوفر حالياً", "Currently unavailable") : justAdded ? t("أُضيفت للسلة", "Added to bag") : t("أضيفي للسلة", "Add to bag")}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={() => doAdd(true)} disabled={!canBuy}>{t("اشتري الآن", "Buy now")}</button>
        <button type="button" className={cn("btn-secondary w-12 px-0", wish.has(product.id) && "bg-blush border-blush")} onClick={() => wish.toggle(product.id)}
          aria-pressed={wish.has(product.id)} aria-label={t("المفضلة", "Wishlist")}>
          <Icon name="heart" className={cn("h-5 w-5", wish.has(product.id) && "fill-plum")} />
        </button>
      </div>
    </div>
  );
}
