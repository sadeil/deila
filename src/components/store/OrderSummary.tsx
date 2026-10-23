"use client";
import Image from "next/image";
import { useState } from "react";
import type { Quote } from "@/lib/services/pricing";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { Icon } from "../ui/Icon";
import { useCart } from "./CartProvider";

/** Totals always come from the server quote — never from client-side arithmetic. */
export function OrderSummary({ quote, loading, showLines = true, showShipping = true }: {
  quote: Quote | null; loading: boolean; showLines?: boolean; showShipping?: boolean;
}) {
  const t = useT();
  const l = t.locale;
  const cart = useCart();
  const [code, setCode] = useState(cart.coupon ?? "");
  const row = (label: React.ReactNode, value: React.ReactNode, cls = "") => (
    <div className={`flex justify-between gap-4 ${cls}`}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>
  );
  const sk = <span className="skeleton inline-block h-4 w-16 rounded align-middle" />;

  return (
    <div className="space-y-6">
      {showLines && quote && (
        <ul className="space-y-4">
          {quote.lines.map((ln) => (
            <li key={ln.variantId} className="flex items-center gap-4">
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ivory-100">
                {ln.image && <Image src={ln.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-plum px-1 text-[10px] font-bold text-ivory">{ln.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{l === "ar" ? ln.nameAr : ln.nameEn}</span>
                {(ln.variantNameAr || ln.variantNameEn) && <span className="block text-xs text-plum-500">{l === "ar" ? ln.variantNameAr : ln.variantNameEn}</span>}
                <span className="block text-xs text-plum-500 tabular-nums">{ln.quantity} × {formatMoney(ln.unitPrice, l)}</span>
                {ln.issue && <span className="block text-xs text-danger">{errorLabel(l, ln.issue === "UNAVAILABLE" ? "UNAVAILABLE_ITEMS" : "OUT_OF_STOCK")}</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(ln.lineTotal, l)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Not a <form>: this summary is rendered inside the checkout form, and forms cannot nest. */}
      <div className="flex gap-2" role="group" aria-label={t("كود الخصم", "Discount code")}>
        <label htmlFor="coupon" className="sr-only">{t("كود الخصم", "Discount code")}</label>
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("كود الخصم", "Discount code")}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (code) cart.setCoupon(code); } }}
          dir="ltr" className="field h-11 text-start font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal [html[dir=rtl]_&]:placeholder:text-right" autoComplete="off" />
        {cart.coupon ? (
          <button type="button" className="btn-secondary h-11 px-4" onClick={() => { setCode(""); cart.setCoupon(null); }}>{t("إزالة", "Remove")}</button>
        ) : (
          <button type="button" className="btn-secondary h-11 px-5" disabled={!code} onClick={() => cart.setCoupon(code || null)}>{t("تطبيق", "Apply")}</button>
        )}
      </div>
      {quote?.coupon && (
        <p className={`-mt-3 flex items-center gap-1.5 text-xs ${quote.coupon.valid ? "text-success" : "text-danger"}`} role="status">
          <Icon name={quote.coupon.valid ? "check" : "alert"} className="h-3.5 w-3.5" />
          {quote.coupon.valid ? t(`تم تطبيق الكود ${quote.coupon.code}`, `Code ${quote.coupon.code} applied`) : errorLabel(l, quote.coupon.reason ?? "COUPON_INVALID")}
        </p>
      )}

      <dl className="space-y-3 border-t border-ivory-200 pt-5 text-sm">
        {row(t("المجموع الفرعي", "Subtotal"), quote && !loading ? formatMoney(quote.subtotal, l) : sk)}
        {quote && quote.discount > 0 && row(t("الخصم", "Discount"), `−${formatMoney(quote.discount, l)}`, "text-success")}
        {showShipping && row(
          t("التوصيل", "Delivery"),
          !quote?.shipping ? <span className="text-plum-500">{t("اختاري المنطقة", "Select area")}</span>
            : !quote.shipping.serviceable ? <span className="text-danger">{t("غير متاح", "Unavailable")}</span>
            : quote.shipping.fee === 0 ? <span className="text-success">{t("مجاني", "Free")}</span>
            : formatMoney(quote.shipping.fee, l),
        )}
        {quote?.shipping?.serviceable && quote.shipping.freeShippingMin != null && !quote.shipping.freeShippingApplied && (
          <p className="rounded-lg bg-blush-50 px-3 py-2 text-xs">
            {t(`أضيفي ${formatMoney(quote.shipping.freeShippingMin - (quote.subtotal - quote.discount), l)} للحصول على توصيل مجاني`,
              `Add ${formatMoney(quote.shipping.freeShippingMin - (quote.subtotal - quote.discount), l)} more for free delivery`)}
          </p>
        )}
        <div className="flex justify-between border-t border-ivory-200 pt-4 text-base font-semibold">
          <dt>{t("الإجمالي", "Total")}</dt>
          <dd className="tabular-nums">{quote && !loading ? formatMoney(quote.total, l) : sk}</dd>
        </div>
        {quote?.shipping?.serviceable && (
          <p className="text-xs text-plum-500">{t(`التوصيل المتوقع خلال ${quote.shipping.etaMinDays}–${quote.shipping.etaMaxDays} أيام عمل`, `Estimated delivery in ${quote.shipping.etaMinDays}–${quote.shipping.etaMaxDays} business days`)}</p>
        )}
      </dl>
    </div>
  );
}
