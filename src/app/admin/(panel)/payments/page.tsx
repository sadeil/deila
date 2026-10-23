import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { orderWhere } from "@/lib/admin-queries";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { activeProviderInfo } from "@/lib/services/payments";
import { Badge, Empty, Kpi, Notice, PageHeader, Panel, Table, paymentTone } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const admin = await requireAdminPage("payments.view");
  const t = await getT();
  const l = t.locale;
  const scope = orderWhere({}, admin.partnerId);
  const [payments, agg, refunds, events] = await Promise.all([
    db.payment.findMany({ where: { order: scope }, orderBy: { createdAt: "desc" }, take: 200, include: { order: { select: { id: true, number: true, fullName: true } }, refunds: true } }),
    db.payment.groupBy({ by: ["method", "status"], where: { order: scope }, _sum: { amount: true }, _count: true }),
    db.refund.aggregate({ where: { status: "COMPLETED", order: scope }, _sum: { amount: true } }),
    db.paymentEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const pay = activeProviderInfo();
  const sum = (method: string, statuses: string[]) => agg.filter((a) => a.method === method && statuses.includes(a.status)).reduce((s, a) => s + (a._sum.amount ?? 0), 0);
  const m = (v: number) => formatMoney(v, l);
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <PageHeader title={t("المدفوعات", "Payments")} actions={<a href="/api/admin/export/payments" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a>} />
      {!pay.configured && <div className="mb-6"><Notice>{t("لا توجد بوابة دفع بالبطاقة مُفعّلة. مدفوعات البطاقة لا يمكن تأكيدها إلا عبر إشعار موقّع من بوابة حقيقية — لا يمكن محاكاتها من هنا.", "No card gateway is active. Card payments can only be confirmed by a signed webhook from a real gateway — they cannot be simulated from here.")}</Notice></div>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon="cash" label={t("نقداً عند الاستلام — مُحصّل", "COD collected")} value={m(sum("COD", ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]))} />
        <Kpi icon="cash" label={t("نقداً — بانتظار التحصيل", "COD awaiting collection")} value={m(sum("COD", ["UNPAID"]))} />
        <Kpi icon="card" label={t("بطاقات — مؤكدة من البوابة", "Card — gateway-confirmed")} value={m(sum("CARD", ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]))} />
        <Kpi icon="alert" label={t("مبالغ مستردة", "Refunded")} value={m(refunds._sum.amount ?? 0)} />
      </div>
      <Panel className="mt-6" pad={false} title={t("سجل المدفوعات", "Payment records")}>
        {payments.length === 0 ? <Empty icon="card" title={t("لا مدفوعات بعد", "No payments yet")} /> : (
          <Table>
            <thead><tr><th>{t("الطلب", "Order")}</th><th>{t("التاريخ", "Date")}</th><th>{t("الطريقة", "Method")}</th><th>{t("المزوّد", "Provider")}</th><th>{t("المرجع", "Reference")}</th><th>{t("الحالة", "Status")}</th><th>{t("المبلغ", "Amount")}</th><th>{t("التحصيل", "Collection")}</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/orders/${p.order.id}`} className="font-mono hover:underline" dir="ltr">{p.order.number}</Link><span className="block text-[11px] text-plum-500">{p.order.fullName}</span></td>
                  <td className="text-xs">{fmt.format(p.createdAt)}</td>
                  <td className="text-xs">{paymentMethodLabel(l, p.method)}</td>
                  <td className="font-mono text-xs">{p.provider}</td>
                  <td className="max-w-[160px] truncate font-mono text-[11px]" dir="ltr">{p.providerRef ?? "—"}</td>
                  <td><Badge tone={paymentTone(p.status)}>{paymentStatusLabel(l, p.status)}</Badge>{p.verifiedByProvider && <span className="block text-[11px] text-success">✓ {t("موثّق", "verified")}</span>}</td>
                  <td className="tabular-nums">{m(p.amount)}{p.refunds.length > 0 && <span className="block text-[11px] text-danger">−{m(p.refunds.reduce((s, r) => s + r.amount, 0))}</span>}</td>
                  <td className="text-xs">{p.collectedBy ? `${p.collectedBy} · ${p.collectedAt ? fmt.format(p.collectedAt) : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Panel className="mt-6" title={t("آخر إشعارات البوابة (Webhooks)", "Recent gateway webhooks")}>
        {events.length ? <ul className="space-y-1 font-mono text-xs">{events.map((e) => <li key={e.id}>{fmt.format(e.createdAt)} · {e.provider} · {e.type} · {e.eventId} · {e.processedAt ? "processed" : "pending"}</li>)}</ul> : <p className="text-sm text-plum-500">{t("لا يوجد", "None")}</p>}
      </Panel>
    </>
  );
}
