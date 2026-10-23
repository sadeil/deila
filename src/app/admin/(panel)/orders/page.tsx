import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { orderWhere, type OrderFilters } from "@/lib/admin-queries";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ORDER_STATUS, PAYMENT_STATUS, paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge, Empty, PageHeader, Panel, Table, orderTone, paymentTone } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Orders" };
const PER = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const admin = await requireAdminPage("orders.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const where = orderWhere(sp, admin.partnerId);
  const page = Math.max(1, Number(sp.page) || 1);
  const [orders, total, govs, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { commission: { select: { amount: true, status: true } }, _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.findMany({ distinct: ["governorateName"], select: { governorateName: true }, where: admin.partnerId ? { partnerId: admin.partnerId } : {} }),
    db.order.groupBy({ by: ["status"], _count: true, where: admin.partnerId ? { partnerId: admin.partnerId } : {} }),
  ]);
  const pages = Math.ceil(total / PER);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
    return `?${p.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "short", timeStyle: "short" });
  const cnt = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title={t("الطلبات", "Orders")} description={t(`${total} طلب مطابق`, `${total} matching orders`)}
        actions={<a href={`/api/admin/export/orders?${exportQs}`} className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a>} />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
        <Link href={qs({ status: undefined, page: undefined })} className={cn("chip whitespace-nowrap", !sp.status && "border-plum bg-plum text-ivory")}>{t("الكل", "All")}</Link>
        {Object.keys(ORDER_STATUS).map((s) => (
          <Link key={s} href={qs({ status: s, page: undefined })} className={cn("chip whitespace-nowrap", sp.status === s && "border-plum bg-plum text-ivory")}>
            {statusLabel(l, s)} <span className="opacity-60">{cnt(s)}</span>
          </Link>
        ))}
      </div>

      <Panel pad={false}>
        <form className="grid gap-3 border-b border-ivory-200 p-4 sm:grid-cols-2 lg:grid-cols-6">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input name="q" defaultValue={sp.q} placeholder={t("رقم الطلب، الاسم، الهاتف…", "Order #, name, phone…")} className="field h-10 text-sm lg:col-span-2" />
          <select name="payment" defaultValue={sp.payment ?? ""} className="field h-10 text-sm" aria-label={t("حالة الدفع", "Payment status")}>
            <option value="">{t("كل حالات الدفع", "All payment statuses")}</option>
            {Object.keys(PAYMENT_STATUS).map((s) => <option key={s} value={s}>{paymentStatusLabel(l, s)}</option>)}
          </select>
          <select name="method" defaultValue={sp.method ?? ""} className="field h-10 text-sm" aria-label={t("طريقة الدفع", "Payment method")}>
            <option value="">{t("كل الطرق", "All methods")}</option>
            <option value="COD">{paymentMethodLabel(l, "COD")}</option>
            <option value="CARD">{paymentMethodLabel(l, "CARD")}</option>
          </select>
          <select name="gov" defaultValue={sp.gov ?? ""} className="field h-10 text-sm" aria-label={t("المنطقة", "Location")}>
            <option value="">{t("كل المناطق", "All locations")}</option>
            {govs.map((g) => <option key={g.governorateName} value={g.governorateName}>{g.governorateName}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" name="from" defaultValue={sp.from} className="field h-10 px-2 text-xs" aria-label={t("من", "From")} />
            <input type="date" name="to" defaultValue={sp.to} className="field h-10 px-2 text-xs" aria-label={t("إلى", "To")} />
          </div>
          <div className="flex gap-2 lg:col-span-6">
            <button className="btn-primary btn-sm h-9">{t("تصفية", "Filter")}</button>
            <Link href="/admin/orders" className="btn-ghost btn-sm h-9">{t("مسح", "Reset")}</Link>
          </div>
        </form>
        {orders.length === 0 ? <Empty title={t("لا توجد طلبات مطابقة", "No matching orders")} /> : (
          <Table>
            <thead><tr>
              <th>{t("الطلب", "Order")}</th><th>{t("التاريخ", "Date")}</th><th>{t("العميل", "Customer")}</th><th>{t("المنطقة", "Location")}</th>
              <th>{t("الحالة", "Status")}</th><th>{t("الدفع", "Payment")}</th><th>{t("الإجمالي", "Total")}</th><th>{t("العمولة", "Commission")}</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline" dir="ltr">{o.number}</Link><span className="block text-[11px] text-plum-500">{o._count.items} {t("منتج", "items")}</span></td>
                  <td className="whitespace-nowrap text-xs text-plum-500">{fmt.format(o.createdAt)}</td>
                  <td>{o.fullName}<span className="block text-[11px] text-plum-500" dir="ltr">{o.phone}</span></td>
                  <td className="text-xs">{o.governorateName}<span className="block text-plum-500">{o.cityName}</span></td>
                  <td><Badge tone={orderTone(o.status)}>{statusLabel(l, o.status)}</Badge></td>
                  <td><Badge tone={paymentTone(o.paymentStatus)}>{paymentStatusLabel(l, o.paymentStatus)}</Badge><span className="mt-1 block text-[11px] text-plum-500">{paymentMethodLabel(l, o.paymentMethod)}</span></td>
                  <td className="font-semibold tabular-nums">{formatMoney(o.total, l)}</td>
                  <td className="tabular-nums text-xs">{o.commission ? <span className={o.commission.status === "VOID" ? "line-through opacity-50" : ""}>{formatMoney(o.commission.amount, l)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <nav className="flex items-center justify-between border-t border-ivory-200 px-4 py-3 text-sm">
            <span className="text-plum-500">{t(`صفحة ${page} من ${pages}`, `Page ${page} of ${pages}`)}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-secondary btn-sm h-8">{t("السابق", "Previous")}</Link>}
              {page < pages && <Link href={qs({ page: String(page + 1) })} className="btn-secondary btn-sm h-8">{t("التالي", "Next")}</Link>}
            </div>
          </nav>
        )}
      </Panel>
    </>
  );
}
