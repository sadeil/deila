import Link from "next/link";
import { cancelSettlement, createSettlement, markSettlementPaid, voidCommissionManually } from "@/app/admin/actions/business";
import { can, requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { commissionStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { Badge, Empty, Kpi, PageHeader, Panel, Table, commissionTone } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Commissions" };

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await requireAdminPage("commissions.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const m = (v: number) => formatMoney(v, l);
  const manage = can(admin, "commissions.manage");
  const statusFilter = ["PENDING", "APPROVED", "PAID", "VOID"].includes(sp.status ?? "") ? (sp.status as "PENDING") : undefined;

  const [byStatus, unsettled, clawbacks, list, settlements, partners, items, all] = await Promise.all([
    db.commission.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
    db.commission.groupBy({ by: ["partnerId"], where: { status: "APPROVED", settlementId: null }, _sum: { amount: true }, _count: true }),
    db.commission.aggregate({ where: { status: "VOID", voidReason: { startsWith: "CLAWBACK" } }, _sum: { amount: true } }),
    db.commission.findMany({ where: statusFilter ? { status: statusFilter } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { order: true } }),
    db.commissionSettlement.findMany({ orderBy: { createdAt: "desc" }, include: { partner: true, _count: { select: { commissions: true } } } }),
    db.partner.findMany(),
    db.orderItem.groupBy({ by: ["productId", "nameAr", "nameEn"], where: { order: { commission: { status: { not: "VOID" } } } }, _sum: { commissionAmount: true, quantity: true }, orderBy: { _sum: { commissionAmount: "desc" } }, take: 10 }),
    db.commission.findMany({ where: { status: { not: "VOID" } }, select: { amount: true, createdAt: true, status: true } }),
  ]);
  const sum = (s: string) => byStatus.find((b) => b.status === s)?._sum.amount ?? 0;
  const outstanding = unsettled.reduce((a, u) => a + (u._sum.amount ?? 0), 0);
  const months = new Map<string, { earned: number; pending: number; paid: number }>();
  for (const c of all) {
    const k = c.createdAt.toISOString().slice(0, 7);
    const r = months.get(k) ?? { earned: 0, pending: 0, paid: 0 };
    if (c.status === "APPROVED") r.earned += c.amount; else if (c.status === "PENDING") r.pending += c.amount; else if (c.status === "PAID") r.paid += c.amount;
    months.set(k, r);
  }
  const monthRows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "medium" });

  return (
    <>
      <PageHeader title={t("العمولات", "Commissions")} description={t("دخل ديلا من الطلبات المحوّلة للشريك. تُستحق فقط بعد التوصيل وتحصيل الدفع.", "DELLA's income from orders sent to the partner. Earned only once delivered and payment is collected.")}
        actions={<><a href="/api/admin/export/commissions" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a><a href="/api/admin/export/settlements" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />{t("التسويات", "Settlements")}</a></>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi tone="plum" icon="coins" label={t("رصيد مستحق غير مُسوّى", "Outstanding balance")} value={m(outstanding)} hint={t("مستحقة ولم تُدفع بعد", "Earned, not yet settled")} />
        <Kpi label={t("إجمالي المستحق", "Total earned")} value={m(sum("APPROVED") + sum("PAID"))} />
        <Kpi label={t("معلّقة", "Pending")} value={m(sum("PENDING"))} hint={t("طلبات لم تُوصَّل/تُحصَّل بعد", "Orders not yet delivered/collected")} />
        <Kpi label={t("مدفوعة", "Paid")} value={m(sum("PAID"))} />
        <Kpi tone="gold" label={t("استردادات بعد التسوية", "Clawbacks after settlement")} value={m(clawbacks._sum.amount ?? 0)} hint={t("مرتجعات بعد الدفع — تُخصم من التسوية التالية", "Returned after payout — deduct next settlement")} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t("التسوية مع الشركاء", "Partner settlements")}>
          {unsettled.length === 0 ? <p className="text-sm text-plum-500">{t("لا عمولات مستحقة بانتظار التسوية.", "No earned commissions awaiting settlement.")}</p> : (
            <ul className="space-y-3">
              {unsettled.map((u) => (
                <li key={u.partnerId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory-100 p-3 text-sm">
                  <span>{partners.find((p) => p.id === u.partnerId)?.name} · {u._count} {t("طلب", "orders")}</span>
                  <span className="font-semibold tabular-nums">{m(u._sum.amount ?? 0)}</span>
                  {manage && <ActionForm action={createSettlement}><input type="hidden" name="partnerId" value={u.partnerId} /><button className="btn-primary btn-sm h-8">{t("إنشاء تسوية", "Create settlement")}</button></ActionForm>}
                </li>
              ))}
            </ul>
          )}
          {settlements.length > 0 && (
            <ul className="mt-5 divide-y divide-ivory-200 border-t border-ivory-200 text-sm">
              {settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>{fmt.format(s.createdAt)} · {s.partner.name} · {s._count.commissions} {t("طلب", "orders")}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{m(s.amount)}</span>
                    <Badge tone={s.status === "PAID" ? "success" : "warning"}>{s.status === "PAID" ? t("مدفوعة", "Paid") : t("مسودة", "Draft")}</Badge>
                    {s.reference && <span className="text-xs text-plum-500">#{s.reference}</span>}
                  </span>
                  {manage && s.status !== "PAID" && (
                    <div className="flex w-full gap-2">
                      <ActionForm action={markSettlementPaid} className="flex flex-1 gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input name="reference" required placeholder={t("مرجع التحويل", "Transfer reference")} className="field h-8 flex-1 text-xs" />
                        <ConfirmButton message={t("تأكيد استلام دفعة العمولة؟", "Confirm the commission payout was received?")} className="btn-primary btn-sm h-8">{t("تعليم كمدفوعة", "Mark paid")}</ConfirmButton>
                      </ActionForm>
                      <ActionForm action={cancelSettlement}><input type="hidden" name="id" value={s.id} /><button className="btn-ghost btn-sm h-8 text-xs">{t("إلغاء", "Cancel")}</button></ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title={t("العمولة حسب الشهر", "Commission by month")} pad={false}>
            {monthRows.length ? (
              <Table><thead><tr><th>{t("الشهر", "Month")}</th><th>{t("معلّقة", "Pending")}</th><th>{t("مستحقة", "Earned")}</th><th>{t("مدفوعة", "Paid")}</th></tr></thead>
                <tbody>{monthRows.map(([k, r]) => <tr key={k}><td className="font-mono text-xs">{k}</td><td className="tabular-nums">{m(r.pending)}</td><td className="tabular-nums">{m(r.earned)}</td><td className="tabular-nums">{m(r.paid)}</td></tr>)}</tbody>
              </Table>
            ) : <Empty icon="coins" title={t("لا بيانات بعد", "No data yet")} />}
          </Panel>
          <Panel title={t("العمولة حسب المنتج", "Commission by product")} pad={false}>
            {items.length ? (
              <Table><thead><tr><th>{t("المنتج", "Product")}</th><th>{t("الكمية", "Units")}</th><th>{t("العمولة", "Commission")}</th></tr></thead>
                <tbody>{items.map((i) => <tr key={i.productId + i.nameEn}><td>{l === "ar" ? i.nameAr : i.nameEn}</td><td className="tabular-nums">{i._sum.quantity}</td><td className="tabular-nums">{m(i._sum.commissionAmount ?? 0)}</td></tr>)}</tbody>
              </Table>
            ) : <Empty icon="coins" title={t("لا بيانات بعد", "No data yet")} />}
          </Panel>
        </div>
      </div>

      <Panel className="mt-6" title={t("العمولة لكل طلب", "Commission per order")} pad={false}
        actions={<div className="flex flex-wrap gap-1 text-xs">{[undefined, "PENDING", "APPROVED", "PAID", "VOID"].map((s) => <Link key={s ?? "all"} href={s ? `?status=${s}` : "?"} className={cn("chip", statusFilter === s && "border-plum bg-plum text-ivory")}>{s ? commissionStatusLabel(l, s) : t("الكل", "All")}</Link>)}</div>}>
        {list.length === 0 ? <Empty icon="coins" title={t("لا توجد عمولات", "No commissions")} /> : (
          <Table>
            <thead><tr><th>{t("الطلب", "Order")}</th><th>{t("حالة الطلب", "Order status")}</th><th>{t("الأساس", "Base")}</th><th>{t("العمولة", "Commission")}</th><th>{t("الحالة", "Status")}</th>{manage && <th />}</tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/orders/${c.orderId}`} className="font-mono hover:underline" dir="ltr">{c.order.number}</Link><span className="block text-[11px] text-plum-500">{fmt.format(c.createdAt)}</span></td>
                  <td className="text-xs">{statusLabel(l, c.order.status)}</td>
                  <td className="tabular-nums">{m(c.baseAmount)}</td>
                  <td className="font-semibold tabular-nums">{m(c.amount)}</td>
                  <td><Badge tone={commissionTone(c.status)}>{commissionStatusLabel(l, c.status)}</Badge>{c.voidReason && <span className="block text-[11px] text-plum-500">{c.voidReason}</span>}</td>
                  {manage && <td>{(c.status === "PENDING" || c.status === "APPROVED") && (
                    <ActionForm action={voidCommissionManually} className="flex gap-1"><input type="hidden" name="id" value={c.id} /><input name="reason" required placeholder={t("سبب الإلغاء", "Void reason")} className="field h-8 w-32 text-xs" /><ConfirmButton message={t("إلغاء هذه العمولة؟", "Void this commission?")} className="btn-ghost btn-sm h-8 text-xs text-danger">{t("إلغاء", "Void")}</ConfirmButton></ActionForm>
                  )}</td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
