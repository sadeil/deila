import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireAdminPage, can } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { overview, parseRange } from "@/lib/services/analytics";
import { activeProviderInfo } from "@/lib/services/payments";
import { channelStatus } from "@/lib/services/notifications";
import { db } from "@/lib/db";
import { HBarChart, RevenueChart, SplitBar } from "@/components/admin/Charts";
import { DateRange } from "@/components/admin/DateRange";
import { Badge, Empty, Kpi, Notice, PageHeader, Panel, Table, orderTone, paymentTone } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const admin = await requireAdminPage();
  if (!can(admin, "dashboard.view")) redirect(can(admin, "orders.view") ? "/admin/orders" : "/admin/forbidden");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const range = parseRange(sp);
  const d = await overview(range, admin.partnerId);
  const m = (v: number) => formatMoney(v, l);
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const pay = activeProviderInfo();
  const ch = channelStatus();
  const demoCount = await db.product.count({ where: { isDemo: true, status: "PUBLISHED" } });

  return (
    <>
      <PageHeader title={t(`مرحباً، ${admin.name.split(" ")[0]}`, `Welcome, ${admin.name.split(" ")[0]}`)} description={t("ملخص أداء المتجر من بيانات حقيقية.", "Store performance from live data.")}
        actions={<Suspense><DateRange from={range.fromStr} to={range.toStr} /></Suspense>} />

      <div className="mb-6 space-y-2">
        {demoCount > 0 && <Notice>{t(`${demoCount} منتجات تجريبية منشورة — تحقّقي من الأسعار والمواصفات مع الشريك ثم ألغي علامة "تجريبي".`, `${demoCount} demo products are published — verify price and specs with the partner, then clear the "demo" flag.`)} <Link className="underline" href="/admin/products?demo=1">{t("مراجعة", "Review")}</Link></Notice>}
        {!pay.configured && <Notice>{t("الدفع بالبطاقة غير مُفعّل: لم تُضبط بوابة دفع معتمدة بعد. الدفع عند الاستلام يعمل.", "Card payments are not live: no approved payment gateway is configured yet. Cash on delivery is working.")}</Notice>}
        {pay.sandbox && <Notice>{t("بوابة الدفع في وضع الاختبار (Sandbox) — لا تُستخدم في الإنتاج.", "Payment gateway is in SANDBOX test mode — not for production.")}</Notice>}
        {(!ch.email || !ch.whatsapp) && <Notice icon="bell">{t(`قنوات غير مُعدّة: ${[!ch.email && "البريد", !ch.whatsapp && "واتساب"].filter(Boolean).join("، ")} — لن تُرسل رسائل للعملاء عبرها.`, `Not configured: ${[!ch.email && "Email", !ch.whatsapp && "WhatsApp"].filter(Boolean).join(", ")} — customer messages on these channels are not sent.`)}</Notice>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi tone="plum" icon="coins" label={t("القيمة الإجمالية للطلبات", "Gross order value")} value={m(d.grossValue)} hint={t(`${d.activeOrders} طلب نشط (بدون الملغاة)`, `${d.activeOrders} active orders (excl. canceled)`)} />
        <Kpi icon="check" label={t("إيراد الطلبات المؤكدة", "Confirmed revenue")} value={m(d.confirmedRevenue)} hint={t("مؤكد ← تم التوصيل", "Confirmed → delivered")} />
        <Kpi icon="cash" label={t("مدفوعات مُحصّلة", "Collected payments")} value={m(d.collected)} hint={d.refunded ? t(`مسترد: ${m(d.refunded)}`, `Refunded: ${m(d.refunded)}`) : t("لا استردادات", "No refunds")} />
        <Kpi tone="gold" icon="handshake" label={t("عمولة مستحقة لديلا", "Commission earned")} value={m(d.commission.earned)} hint={t(`معلّقة ${m(d.commission.pending)} · مدفوعة ${m(d.commission.paid)}`, `Pending ${m(d.commission.pending)} · Paid ${m(d.commission.paid)}`)} />
        <Kpi icon="package" label={t("إجمالي الطلبات", "Total orders")} value={d.totalOrders} />
        <Kpi icon="bell" label={t("بانتظار التأكيد", "Pending confirmation")} value={d.pending} hint={d.pending ? <Link href="/admin/orders?status=PENDING_CONFIRMATION" className="underline">{t("معالجة الآن", "Process now")}</Link> : undefined} />
        <Kpi icon="truck" label={t("تم التوصيل / ملغي", "Delivered / canceled")} value={`${d.delivered} / ${d.canceled}`} />
        <Kpi icon="chart" label={t("متوسط قيمة الطلب", "Average order value")} value={m(d.aov)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title={t("القيمة الإجمالية حسب اليوم", "Gross value by day")}>
          {d.totalOrders ? <RevenueChart data={d.series} /> : <Empty icon="chart" title={t("لا طلبات في هذه الفترة", "No orders in this period")} />}
        </Panel>
        <div className="space-y-6">
          <Panel title={t("طرق الدفع", "Payment methods")}>
            {d.methods.length ? <SplitBar parts={d.methods.map((x) => ({ label: paymentMethodLabel(l, x.method), value: x.count, sub: m(x.total) }))} /> : <p className="text-sm text-plum-500">{t("لا بيانات", "No data")}</p>}
          </Panel>
          <Panel title={t("الطلبات حسب المحافظة", "Orders by governorate")}>
            {d.locations.length ? <HBarChart data={d.locations.map((x) => ({ name: x.name, value: x.count }))} valueLabel={t("طلبات", "Orders")} /> : <p className="text-sm text-plum-500">{t("لا بيانات", "No data")}</p>}
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title={t("أحدث الطلبات", "Recent orders")} className="xl:col-span-2" pad={false} actions={<Link href="/admin/orders" className="text-xs font-semibold underline">{t("الكل", "View all")}</Link>}>
          {d.recent.length ? (
            <Table>
              <thead><tr><th>{t("الطلب", "Order")}</th><th>{t("العميل", "Customer")}</th><th>{t("الحالة", "Status")}</th><th>{t("الدفع", "Payment")}</th><th>{t("الإجمالي", "Total")}</th><th>{t("التاريخ", "Date")}</th></tr></thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold underline-offset-2 hover:underline" dir="ltr">{o.number}</Link></td>
                    <td>{o.fullName}</td>
                    <td><Badge tone={orderTone(o.status)}>{statusLabel(l, o.status)}</Badge></td>
                    <td><Badge tone={paymentTone(o.paymentStatus)}>{paymentStatusLabel(l, o.paymentStatus)}</Badge></td>
                    <td className="tabular-nums">{m(o.total)}</td>
                    <td className="text-xs text-plum-500">{fmt.format(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <Empty title={t("لا طلبات بعد", "No orders yet")} />}
        </Panel>
        <div className="space-y-6">
          <Panel title={t("الأكثر مبيعاً", "Best sellers")}>
            {d.bestSellers.length ? (
              <ol className="space-y-3 text-sm">
                {d.bestSellers.map((b, i) => (
                  <li key={b.productId} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ivory-100 text-xs font-semibold">{i + 1}</span>
                    <span className="flex-1 truncate">{l === "ar" ? b.nameAr : b.nameEn}</span>
                    <span className="text-plum-500 tabular-nums">{b.qty}×</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-plum-500">{t("لا مبيعات في هذه الفترة", "No sales in this period")}</p>}
          </Panel>
          <Panel title={t("تنبيهات المخزون", "Stock alerts")} actions={<Link href="/admin/inventory" className="text-xs font-semibold underline">{t("المخزون", "Inventory")}</Link>}>
            {d.lowStock.length ? (
              <ul className="space-y-2 text-sm">
                {d.lowStock.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{l === "ar" ? s.variant.product.nameAr : s.variant.product.nameEn} <span className="text-plum-500">· {l === "ar" ? s.variant.nameAr : s.variant.nameEn}</span></span>
                    <Badge tone={s.availability === "OUT_OF_STOCK" || s.quantity <= 0 ? "danger" : "warning"}>{s.trackQuantity ? s.quantity : t("نفد", "Out")}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-plum-500">{t("لا تنبيهات. (المخزون غير المتتبع لا يظهر هنا)", "No alerts. (Untracked inventory isn't shown here.)")}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
