"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { Icon } from "../ui/Icon";
import { useCart } from "./CartProvider";
import { OrderSummary } from "./OrderSummary";

export function CartView() {
  const t = useT();
  const l = t.locale;
  const cart = useCart();
  const { refreshQuote, ready } = cart;
  useEffect(() => { if (ready) void refreshQuote(); }, [ready, refreshQuote]);

  if (!ready) return <div className="container py-20"><div className="skeleton h-64 rounded-3xl" /></div>;

  return (
    <div className="container pb-24 pt-10 md:pt-14">
      <h1 className="display text-display-lg">{t("سلة التسوق", "Shopping bag")}</h1>
      {cart.lines.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl bg-ivory-100 px-6 py-20 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-blush"><Icon name="bag" className="h-8 w-8" /></span>
          <h2 className="display mt-6 text-2xl">{t("سلتك فارغة", "Your bag is empty")}</h2>
          <Link href="/shop" className="btn-primary mt-8">{t("ابدئي التسوق", "Start shopping")}</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
          <ul className="divide-y divide-ivory-200 border-y border-ivory-200">
            <AnimatePresence initial={false}>
              {cart.lines.map((line) => {
                const q = cart.quote?.lines.find((x) => x.variantId === line.variantId);
                return (
                  <motion.li key={line.variantId} layout exit={{ opacity: 0, height: 0 }} className="flex gap-5 py-6">
                    <Link href={`/product/${line.snap.slug}`} className="relative h-32 w-28 shrink-0 overflow-hidden rounded-2xl bg-ivory-100">
                      {line.snap.image && <Image src={line.snap.image} alt="" fill sizes="112px" className="object-cover" />}
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-4">
                        <div>
                          <Link href={`/product/${line.snap.slug}`} className="font-medium link-underline">{l === "ar" ? line.snap.nameAr : line.snap.nameEn}</Link>
                          {(line.snap.variantNameAr || line.snap.variantNameEn) && <p className="text-sm text-plum-500">{l === "ar" ? line.snap.variantNameAr : line.snap.variantNameEn}</p>}
                          <p className="mt-1 text-sm text-plum-500 tabular-nums">{formatMoney(q?.unitPrice ?? line.snap.unitPrice, l)}</p>
                          {q?.issue && <p className="mt-1 text-sm text-danger">{errorLabel(l, q.issue === "UNAVAILABLE" ? "UNAVAILABLE_ITEMS" : "OUT_OF_STOCK")}</p>}
                        </div>
                        <p className="font-semibold tabular-nums">{q ? formatMoney(q.lineTotal, l) : ""}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex h-10 items-center rounded-full border border-ivory-300">
                          <button className="grid h-10 w-10 place-items-center disabled:opacity-30" disabled={line.quantity <= 1} onClick={() => cart.setQty(line.variantId, line.quantity - 1)} aria-label={t("إنقاص", "Decrease")}><Icon name="minus" className="h-4 w-4" /></button>
                          <span className="w-8 text-center tabular-nums">{line.quantity}</span>
                          <button className="grid h-10 w-10 place-items-center disabled:opacity-30" disabled={!!q && line.quantity >= q.maxQuantity} onClick={() => cart.setQty(line.variantId, line.quantity + 1)} aria-label={t("زيادة", "Increase")}><Icon name="plus" className="h-4 w-4" /></button>
                        </div>
                        <button onClick={() => cart.remove(line.variantId)} className="flex items-center gap-1.5 text-sm text-plum-500 hover:text-danger"><Icon name="trash" className="h-4 w-4" />{t("حذف", "Remove")}</button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <aside className="h-fit space-y-6 rounded-3xl bg-white/70 p-6 ring-1 ring-ivory-200 lg:sticky lg:top-24 md:p-8">
            <h2 className="display text-2xl">{t("ملخص الطلب", "Order summary")}</h2>
            <OrderSummary quote={cart.quote} loading={cart.quoting && !cart.quote} showLines={false} showShipping={false} />
            <p className="text-xs text-plum-500">{t("تُحسب رسوم التوصيل عند اختيار منطقتك.", "Delivery is calculated when you choose your area.")}</p>
            <Link href="/checkout" className="btn-primary w-full h-[52px]">{t("إتمام الطلب", "Proceed to checkout")}</Link>
            <Link href="/shop" className="btn-ghost w-full">{t("متابعة التسوق", "Continue shopping")}</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
