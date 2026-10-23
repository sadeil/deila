import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { verifyOrderToken } from "@/lib/services/orders";
import { OrderTimeline } from "@/components/store/OrderTimeline";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; new?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, sp, t, customer] = await Promise.all([params, searchParams, getT(), getCustomer()]);
  const l = t.locale;
  const order = await db.order.findUnique({
    where: { number: number.slice(0, 20) },
    include: {
      items: true,
      history: { orderBy: { createdAt: "asc" } },
      delivery: { include: { courier: { select: { name: true } } } },
      locality: { include: { zone: true } },
    },
  });
  // Access requires the secret link token or being the signed-in owner. Unknown and unauthorised
  // numbers look identical, so order numbers cannot be probed.
  if (!order || !(verifyOrderToken(order, sp.t) || (customer && order.customerId === customer.id))) notFound();

  const isNew = sp.new === "1";
  const zone = order.locality.zone;

  return (
    <div className="container max-w-5xl pb-24 pt-10 md:pt-16">
      <Reveal className="text-center">
        {isNew ? (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-plum text-gold"><Icon name="check" className="h-7 w-7" strokeWidth={2} /></span>
            <h1 className="display mt-6 text-display-lg">{t("شكراً لكِ!", "Thank you!")}</h1>
            <p className="mx-auto mt-3 max-w-md text-plum-600">
              {order.paymentMethod === "COD"
                ? t("استلمنا طلبك. سنتواصل معك هاتفياً لتأكيده قبل التجهيز.", "We've received your order. We'll call you to confirm it before preparing.")
                : t("استلمنا طلبك. سيتم تأكيده فور وصول تأكيد الدفع من البوابة.", "We've received your order. It will be confirmed once the gateway confirms payment.")}
            </p>
          </>
        ) : (
          <h1 className="display text-display-md">{t("تفاصيل الطلب", "Order details")}</h1>
        )}
        <p className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/70 px-5 py-2.5 ring-1 ring-ivory-200">
          <span className="text-sm text-plum-500">{t("رقم الطلب", "Order number")}</span>
          <span className="font-mono text-lg font-semibold tracking-wider" dir="ltr">{order.number}</span>
        </p>
        {isNew && <p className="mt-3 text-xs text-plum-500">{t("احتفظي بهذا الرابط لتتبع طلبك.", "Keep this page's link to track your order.")}</p>}
      </Reveal>

      <div className="mt-12 grid gap-8 md:grid-cols-[1fr_1.3fr]">
        <section className="card p-6 md:p-8">
          <h2 className="mb-6 text-lg font-semibold">{t("حالة الطلب", "Order status")}</h2>
          <OrderTimeline l={l} status={order.status} history={order.history} />
          {order.delivery?.trackingRef && (
            <p className="mt-6 rounded-xl bg-ivory-100 px-4 py-3 text-sm">
              {t("رقم التتبع:", "Tracking ref:")} <span className="font-mono font-semibold" dir="ltr">{order.delivery.trackingRef}</span>
              {order.delivery.courier && <> · {order.delivery.courier.name}</>}
            </p>
          )}
        </section>

        <section className="card space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip">{statusLabel(l, order.status)}</span>
            <span className="chip">{paymentMethodLabel(l, order.paymentMethod)}</span>
            <span className="chip">{paymentStatusLabel(l, order.paymentStatus)}</span>
          </div>
          <ul className="divide-y divide-ivory-200">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{l === "ar" ? it.nameAr : it.nameEn}</span>
                  {(it.variantNameAr || it.variantNameEn) && <span className="text-plum-500"> · {l === "ar" ? it.variantNameAr : it.variantNameEn}</span>}
                  <span className="block text-xs text-plum-500 tabular-nums">{it.quantity} × {formatMoney(it.unitPrice, l)}</span>
                </span>
                <span className="tabular-nums">{formatMoney(it.lineTotal, l)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-ivory-200 pt-4 text-sm">
            <div className="flex justify-between"><dt>{t("المجموع الفرعي", "Subtotal")}</dt><dd className="tabular-nums">{formatMoney(order.subtotal, l)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success"><dt>{t("الخصم", "Discount")} {order.couponCode && `(${order.couponCode})`}</dt><dd className="tabular-nums">−{formatMoney(order.discount, l)}</dd></div>}
            <div className="flex justify-between"><dt>{t("التوصيل", "Delivery")}</dt><dd className="tabular-nums">{order.shippingFee === 0 ? t("مجاني", "Free") : formatMoney(order.shippingFee, l)}</dd></div>
            <div className="flex justify-between border-t border-ivory-200 pt-3 text-base font-semibold"><dt>{t("الإجمالي", "Total")}</dt><dd className="tabular-nums">{formatMoney(order.total, l)}</dd></div>
          </dl>
          <div className="rounded-xl bg-ivory-100 p-4 text-sm leading-relaxed">
            <p className="font-semibold">{order.fullName}</p>
            <p dir="ltr" className="text-start">{order.phone}</p>
            <p>{order.governorateName} · {order.cityName}</p>
            <p>{order.street} — {order.addressDetails}</p>
            {order.landmark && <p className="text-plum-500">{order.landmark}</p>}
            {zone && <p className="mt-2 text-xs text-plum-500">{t(`التوصيل المتوقع: ${zone.etaMinDays}–${zone.etaMaxDays} أيام عمل`, `Estimated delivery: ${zone.etaMinDays}–${zone.etaMaxDays} business days`)}</p>}
          </div>
        </section>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">{t("متابعة التسوق", "Continue shopping")}</Link>
        <Link href="/contact" className="btn-secondary">{t("تحتاجين مساعدة؟", "Need help?")}</Link>
      </div>
    </div>
  );
}
