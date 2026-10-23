import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentMethodLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { overview, parseRange } from "@/lib/services/analytics";
import { HBarChart, RevenueChart } from "@/components/admin/Charts";
import { DateRange } from "@/components/admin/DateRange";
import { Empty, Kpi, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const admin = await requireAdminPage("reports.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const range = parseRange(sp, 90);
  const d = await overview(range, admin.partnerId);
  const scope = { createdAt: { gte: range.from, lte: range.to }, ...(admin.partnerId ? { partnerId: admin.partnerId } : {}) };
  const [byStatus, byCategory, customers, newCustomers, deliveredTimes] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: scope, _count: true, _sum: { total: true } }),
    db.orderItem.findMany({ where: { order: { ...scope, status: { notIn: ["CANCELED", "RETURNED"] } } }, select: { lineTotal: true, quantity: true, product: { select: { category: { select: { nameAr: true, nameEn: true } } } } } }),
    db.order.groupBy({ by: ["phone"], where: { ...scope, status: { notIn: ["CANCELED"] } }, _count: true }),
    db.customer.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
    db.delivery.findMany({ where: { order: scope, deliveredAt: { not: null } }, select: { deliveredAt: true, order: { select: { createdAt: true } } } }),
  ]);
  const cats = new Map<string, { value: number; units: number }>();
  for (const i of byCategory) {
    const k = l === "ar" ? i.product.category.nameAr : i.product.category.nameEn;
    const r = cats.get(k) ?? { value: 0, units: 0 };
    r.value += i.lineTotal; r.units += i.quantity;
    cats.set(k, r);
  }
  const repeat = customers.filter((c) => c._count > 1).length;
  const avgDays = deliveredTimes.length ? deliveredTimes.reduce((s, x) => s + (+x.deliveredAt! - +x.order.createdAt) / 86400_000, 0) / deliveredTimes.length : null;
  const m = (v: number) => formatMoney(v, l);
  const qs = `from=${range.fromStr}&to=${range.toStr}`;
  const exp = (type: string, label: string) => <a href={`/api/admin/export/${type}?${qs}`} className="btn-secondary btn-sm h-9"><Icon name="download" className="h-4 w-4" />{label}</a>;

  return (
    <>
      <PageHeader title={t("التقارير", "Reports")} actions={<Suspense><DateRange from={range.fromStr} to={range.toStr} /></Suspense>} />
      <div className="mb-6 flex flex-wrap gap-2">
        {exp("orders", t("الطلبات والمبيعات", "Orders & sales"))}{exp("payments", t("المدفوعات والاستردادات", "Payments & refunds"))}
        {exp("commissions", t("العمولات", "Commissions"))}{exp("settlements", t("تسويات الشركاء", "Partner settlements"))}
        {exp("products", t("المنتجات", "Products"))}{exp("customers", t("العملاء", "Customers"))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t("القيمة الإجمالية", "Gross order value")} value={m(d.grossValue)} />
        <Kpi label={t("المُحصّل", "Collected")} value={m(d.collected)} />
        <Kpi label={t("المسترد", "Refunded")} value={m(d.refunded)} />
        <Kpi tone="gold" label={t("عمولة مستحقة + مدفوعة", "Commission earned + paid")} value={m(d.commission.earned + d.commission.paid)} />
        <Kpi label={t("عملاء مميزون (بالجوال)", "Unique customers (by phone)")} value={customers.length} hint={t(`${repeat} عادوا للشراء`, `${repeat} repeat buyers`)} />
        <Kpi label={t("حسابات جديدة", "New accounts")} value={newCustomers} />
        <Kpi label={t("متوسط مدة التوصيل", "Avg. time to delivery")} value={avgDays == null ? "—" : t(`${avgDays.toFixed(1)} يوم`, `${avgDays.toFixed(1)} days`)} />
        <Kpi label={t("متوسط قيمة الطلب", "AOV")} value={m(d.aov)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t("المبيعات اليومية", "Daily sales")}>{d.totalOrders ? <RevenueChart data={d.series} /> : <Empty icon="chart" title={t("لا بيانات", "No data")} />}</Panel>
        <Panel title={t("المبيعات حسب الفئة", "Sales by category")}>{cats.size ? <HBarChart money data={[...cats.entries()].map(([name, v]) => ({ name, value: v.value }))} valueLabel={t("القيمة", "Value")} /> : <Empty icon="chart" title={t("لا بيانات", "No data")} />}</Panel>
        <Panel title={t("الطلبات حسب الحالة", "Orders by status")} pad={false}>
          <Table><thead><tr><th>{t("الحالة", "Status")}</th><th>{t("العدد", "Count")}</th><th>{t("القيمة", "Value")}</th></tr></thead>
            <tbody>{byStatus.map((s) => <tr key={s.status}><td>{statusLabel(l, s.status)}</td><td className="tabular-nums">{s._count}</td><td className="tabular-nums">{m(s._sum.total ?? 0)}</td></tr>)}</tbody></Table>
        </Panel>
        <Panel title={t("التوصيل حسب المحافظة", "Delivery by governorate")} pad={false}>
          <Table><thead><tr><th>{t("المحافظة", "Governorate")}</th><th>{t("الطلبات", "Orders")}</th><th>{t("القيمة", "Value")}</th></tr></thead>
            <tbody>{d.locations.map((x) => <tr key={x.name}><td>{x.name}</td><td className="tabular-nums">{x.count}</td><td className="tabular-nums">{m(x.total)}</td></tr>)}</tbody></Table>
        </Panel>
        <Panel title={t("طرق الدفع", "Payment methods")} pad={false}>
          <Table><thead><tr><th>{t("الطريقة", "Method")}</th><th>{t("الطلبات", "Orders")}</th><th>{t("القيمة", "Value")}</th></tr></thead>
            <tbody>{d.methods.map((x) => <tr key={x.method}><td>{paymentMethodLabel(l, x.method)}</td><td className="tabular-nums">{x.count}</td><td className="tabular-nums">{m(x.total)}</td></tr>)}</tbody></Table>
        </Panel>
        <Panel title={t("أفضل المنتجات", "Top products")} pad={false}>
          <Table><thead><tr><th>{t("المنتج", "Product")}</th><th>{t("الكمية", "Units")}</th><th>{t("القيمة", "Revenue")}</th></tr></thead>
            <tbody>{d.bestSellers.map((b) => <tr key={b.productId}><td>{l === "ar" ? b.nameAr : b.nameEn}</td><td className="tabular-nums">{b.qty}</td><td className="tabular-nums">{m(b.revenue)}</td></tr>)}</tbody></Table>
        </Panel>
      </div>
    </>
  );
}
