import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { Wordmark } from "@/components/brand/Wordmark";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Print order" };

export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders.view");
  const [{ id }, t] = await Promise.all([params, getT()]);
  const l = t.locale;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, partner: true, delivery: true } });
  if (!o || (admin.partnerId && o.partnerId !== admin.partnerId)) notFound();
  const m = (v: number) => formatMoney(v, l);
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-sm text-plum print:p-0">
      <div className="mb-8 flex items-start justify-between">
        <div><Wordmark className="h-7" /><p className="mt-2 text-xs text-plum-500">Gadgets Made for Her.</p></div>
        <div className="text-end">
          <p className="font-mono text-lg font-semibold" dir="ltr">{o.number}</p>
          <p className="text-xs">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
          <PrintButton label={t("طباعة", "Print")} />
        </div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-6">
        <div><p className="mb-1 font-semibold">{t("إلى", "Ship to")}</p><p>{o.fullName}</p><p dir="ltr" className="text-start">{o.phone}</p><p>{o.governorateName} · {o.cityName}</p><p>{o.street} — {o.addressDetails}</p>{o.landmark && <p>{o.landmark}</p>}{o.deliveryNotes && <p className="mt-1 italic">{o.deliveryNotes}</p>}</div>
        <div><p className="mb-1 font-semibold">{t("الدفع", "Payment")}</p><p>{paymentMethodLabel(l, o.paymentMethod)}</p><p>{paymentStatusLabel(l, o.paymentStatus)}</p>{o.paymentMethod === "COD" && o.paymentStatus === "UNPAID" && <p className="mt-2 text-lg font-bold">{t("المبلغ المطلوب تحصيله:", "Amount to collect:")} {m(o.total)}</p>}{o.delivery?.trackingRef && <p className="mt-2">Tracking: {o.delivery.trackingRef}</p>}<p className="mt-2 text-xs">{o.partner.name}</p></div>
      </div>
      <table className="w-full border-collapse text-start [&_td]:border-b [&_td]:py-2 [&_th]:border-b-2 [&_th]:py-2 [&_th]:text-start">
        <thead><tr><th>{t("المنتج", "Item")}</th><th>SKU</th><th>{t("الكمية", "Qty")}</th><th>{t("السعر", "Price")}</th><th>{t("الإجمالي", "Total")}</th></tr></thead>
        <tbody>{o.items.map((it) => <tr key={it.id}><td>{l === "ar" ? it.nameAr : it.nameEn}{it.variantNameEn && ` (${l === "ar" ? it.variantNameAr : it.variantNameEn})`}</td><td className="font-mono text-xs">{it.sku}</td><td>{it.quantity}</td><td>{m(it.unitPrice)}</td><td>{m(it.lineTotal)}</td></tr>)}</tbody>
      </table>
      <div className="ms-auto mt-4 w-64 space-y-1">
        <p className="flex justify-between"><span>{t("المجموع", "Subtotal")}</span><span>{m(o.subtotal)}</span></p>
        {o.discount > 0 && <p className="flex justify-between"><span>{t("الخصم", "Discount")}</span><span>−{m(o.discount)}</span></p>}
        <p className="flex justify-between"><span>{t("التوصيل", "Delivery")}</span><span>{m(o.shippingFee)}</span></p>
        <p className="flex justify-between border-t pt-1 text-base font-bold"><span>{t("الإجمالي", "Total")}</span><span>{m(o.total)}</span></p>
      </div>
    </div>
  );
}
