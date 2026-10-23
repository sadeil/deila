"use client";
import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { ProductPurchase, type PurchaseProduct, type PurchaseVariant } from "./ProductPurchase";

type QuickData = PurchaseProduct & { shortAr: string | null; shortEn: string | null; isDemo: boolean; variants: PurchaseVariant[]; altAr: string | null; altEn: string | null };
const Ctx = createContext<{ open: (slug: string) => void } | null>(null);

export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<QuickData | null>(null);
  const [error, setError] = useState(false);

  const open = useCallback(async (s: string) => {
    setSlug(s); setData(null); setError(false);
    try {
      const res = await fetch(`/api/products/quick?slug=${encodeURIComponent(s)}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError(true); }
  }, []);
  const close = useCallback(() => setSlug(null), []);
  const l = t.locale;

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Sheet open={!!slug} onClose={close} side="center" label={t("نظرة سريعة", "Quick view")}>
        <button onClick={close} className="absolute end-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/80 hover:bg-white" aria-label={t("إغلاق", "Close")}>
          <Icon name="close" />
        </button>
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/5] bg-ivory-100 md:rounded-s-3xl overflow-hidden">
            {data?.image ? <Image src={data.image} alt={(l === "ar" ? data.altAr : data.altEn) ?? ""} fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" /> : <div className="skeleton absolute inset-0" />}
          </div>
          <div className="p-6 md:p-10">
            {error && <p className="text-danger">{t("تعذّر تحميل المنتج.", "Couldn't load this product.")}</p>}
            {!data && !error && <div className="space-y-4"><div className="skeleton h-8 w-3/4 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-12 w-full rounded-full" /></div>}
            {data && (
              <div className="space-y-6">
                <div>
                  {data.isDemo && <p className="mb-3 chip border-gold/40 bg-gold/10 text-gold-700">{t("منتج تجريبي — التفاصيل قيد التحقق", "Demo product — details being verified")}</p>}
                  <h2 className="display text-display-sm">{l === "ar" ? data.nameAr : data.nameEn}</h2>
                  <p className="mt-2 text-plum-600">{l === "ar" ? data.shortAr : data.shortEn}</p>
                </div>
                <ProductPurchase product={data} variants={data.variants} compact onAdded={close} />
                <Link href={`/product/${data.slug}`} onClick={close} className="inline-flex items-center gap-2 text-sm font-semibold link-underline">
                  {t("عرض كل التفاصيل", "View full details")} <Icon name="arrow" className="h-4 w-4 flip-rtl" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useQuickView() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useQuickView outside provider");
  return c;
}
