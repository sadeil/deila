"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const t = useT();
  const l = t.locale;
  const cart = useCart();
  const q = cart.quote;

  return (
    <Sheet open={cart.drawerOpen} onClose={cart.closeDrawer} side="end" label={t("سلة التسوق", "Shopping bag")} className="flex flex-col">
      <header className="flex items-center justify-between border-b border-ivory-200 px-6 py-5">
        <h2 className="display text-2xl">{t("سلتك", "Your bag")} <span className="text-base text-plum-500 font-sans">({cart.count})</span></h2>
        <button onClick={cart.closeDrawer} className="grid h-10 w-10 place-items-center rounded-full hover:bg-plum/5" aria-label={t("إغلاق", "Close")}><Icon name="close" /></button>
      </header>

      <AnimatePresence>
        {cart.lastAdded && Date.now() - cart.lastAdded.at < 2500 && (
          <motion.div key={cart.lastAdded.at} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-blush/60">
            <p className="flex items-center gap-2 px-6 py-3 text-sm font-medium" role="status">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="grid h-6 w-6 place-items-center rounded-full bg-plum text-ivory"><Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} /></motion.span>
              {t("أُضيف إلى سلتك", "Added to your bag")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {cart.lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-blush/60"><Icon name="bag" className="h-8 w-8" /></div>
          <p className="display text-2xl">{t("سلتك فارغة", "Your bag is empty")}</p>
          <p className="text-sm text-plum-500">{t("اكتشفي مختاراتنا وابدئي التسوق.", "Discover our edit and start shopping.")}</p>
          <Link href="/shop" onClick={cart.closeDrawer} className="btn-primary">{t("تسوقي الآن", "Shop now")}</Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-ivory-200 overflow-y-auto px-6">
            <AnimatePresence initial={false}>
              {cart.lines.map((line) => {
                const ql = q?.lines.find((x) => x.variantId === line.variantId);
                const unit = ql?.unitPrice ?? line.snap.unitPrice;
                return (
                  <motion.li key={line.variantId} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-4 py-5">
                    <Link href={`/product/${line.snap.slug}`} onClick={cart.closeDrawer} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
                      {line.snap.image && <Image src={line.snap.image} alt="" fill sizes="80px" className="object-cover" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{l === "ar" ? line.snap.nameAr : line.snap.nameEn}</p>
                        <button onClick={() => cart.remove(line.variantId)} className="text-plum-400 hover:text-danger" aria-label={t("حذف", "Remove")}><Icon name="trash" className="h-4 w-4" /></button>
                      </div>
                      {(line.snap.variantNameAr || line.snap.variantNameEn) && <p className="text-xs text-plum-500">{l === "ar" ? line.snap.variantNameAr : line.snap.variantNameEn}</p>}
                      {ql?.issue && <p className="mt-1 text-xs text-danger">{errorLabel(l, ql.issue === "QUANTITY_ADJUSTED" || ql.issue === "INSUFFICIENT_STOCK" ? "OUT_OF_STOCK" : "UNAVAILABLE_ITEMS")}</p>}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex h-9 items-center rounded-full border border-ivory-300">
                          <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={line.quantity <= 1} onClick={() => cart.setQty(line.variantId, line.quantity - 1)} aria-label={t("إنقاص", "Decrease")}><Icon name="minus" className="h-3.5 w-3.5" /></button>
                          <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                          <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={!!ql && line.quantity >= ql.maxQuantity} onClick={() => cart.setQty(line.variantId, line.quantity + 1)} aria-label={t("زيادة", "Increase")}><Icon name="plus" className="h-3.5 w-3.5" /></button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatMoney(unit * line.quantity, l)}</span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <footer className="space-y-4 border-t border-ivory-200 bg-white/60 px-6 py-5">
            <div className="flex justify-between text-sm">
              <span className="text-plum-600">{t("المجموع الفرعي", "Subtotal")}</span>
              <span className="font-semibold tabular-nums">{q ? formatMoney(q.subtotal, l) : <span className="skeleton inline-block h-4 w-16 rounded" />}</span>
            </div>
            {q && q.discount > 0 && (
              <div className="flex justify-between text-sm text-success"><span>{t("الخصم", "Discount")} ({q.coupon?.code})</span><span className="tabular-nums">−{formatMoney(q.discount, l)}</span></div>
            )}
            <p className="text-xs text-plum-500">{t("تُحسب رسوم التوصيل حسب منطقتك عند الدفع.", "Delivery is calculated for your area at checkout.")}</p>
            {cart.quoteError && <p className="text-xs text-danger">{errorLabel(l, "SERVER")}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/cart" onClick={cart.closeDrawer} className="btn-secondary">{t("عرض السلة", "View bag")}</Link>
              <Link href="/checkout" onClick={cart.closeDrawer} className="btn-primary">{t("إتمام الطلب", "Checkout")}</Link>
            </div>
          </footer>
        </>
      )}
    </Sheet>
  );
}
