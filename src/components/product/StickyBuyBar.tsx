"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/money";
import { Icon } from "../ui/Icon";
import { useCart } from "../store/CartProvider";
import type { PurchaseProduct, PurchaseVariant } from "../store/ProductPurchase";

/** Mobile sticky add-to-bag bar, shown once the main purchase panel scrolls out of view. */
export function StickyBuyBar({ product, variants }: { product: PurchaseProduct; variants: PurchaseVariant[] }) {
  const t = useT();
  const { add } = useCart();
  const [show, setShow] = useState(false);
  const v = variants.find((x) => x.isDefault && x.maxQty > 0) ?? variants.find((x) => x.maxQty > 0);

  useEffect(() => {
    const el = document.getElementById("purchase");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onClick = () => {
    if (variants.length > 1 || !v) {
      document.getElementById("purchase")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    add(v.id, 1, { slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn, image: product.image, unitPrice: v.price });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.35, ease: [0.22, 0.8, 0.24, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory-200 bg-ivory/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.locale === "ar" ? product.nameAr : product.nameEn}</p>
              {v && <p className="text-sm font-semibold tabular-nums">{formatMoney(v.price, t.locale)}</p>}
            </div>
            <button onClick={onClick} disabled={!v} className="btn-primary h-12 px-6">
              <Icon name="bag" className="h-4 w-4" />
              {!v ? t("غير متوفر", "Unavailable") : variants.length > 1 ? t("اختاري الخيار", "Choose option") : t("أضيفي للسلة", "Add to bag")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
