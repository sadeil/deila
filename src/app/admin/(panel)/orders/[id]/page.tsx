import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { commissionStatusLabel, paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { TRANSITIONS } from "@/lib/services/orders";
import { CodForm, DeliveryForm, NoteForm, RefundForm, StatusActions } from "@/components/admin/OrderActions";
import { Badge, Notice, PageHeader, Panel, Table, commissionTone, orderTone, paymentTone } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders.view");
  const [{ id }, t] = await Promise.all([params, getT()]);
  const l = t.locale;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true, history: { orderBy: { createdAt: "asc" } }, notes: { orderBy: { createdAt: "desc" } },
      payments: true, refunds: { orderBy: { createdAt: "desc" } }, delivery: { include: { courier: true } },
      commission: true, partner: true, customer: true,
    },
  });
  if (!o || (admin.partnerId && o.partnerId !== admin.partnerId)) notFound();
  const couriers = await db.courier.findMany({ where: { active: true }, select: { id: true, name: true } });
  const m = (v: number) => formatMoney(v, l);
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const refunded = o.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r.amount, 0);
  const canManage = can(admin, "orders.manage");
  const allowed = TRANSITIONS[o.status].filter((s) => !(s === "CONFIRMED" && o.paymentMethod === "CARD" && o.paymentStatus !== "PAID"));
  const showCommission = can(admin, "commissions.view");

  return (
    <>
      <PageHeader back={{ href: "/admin/orders", label: t("الطلبات", "Orders") }}
        title={t(`الطلب ${o.number}`, `Order ${o.number}`)}
        description={fmt.format(o.createdAt)}
        actions={<>
          <Badge tone={orderTone(o.status)} className="text-xs">{statusLabel(l, o.status)}</Badge>
          <Badge tone={paymentTone(o.paymentStatus)} className="text-xs">{paymentStatusLabel(l, o.paymentStatus)}</Badge>
          <Link href={`/admin/orders/${o.id}/print`} target="_blank" className="btn-secondary btn-sm h-9"><Icon name="print" className="h-4 w-4" />{t("طباعة", "Print")}</Link>
        </>} />

      {o.paymentMethod === "CARD" && o.paymentStatus !== "PAID" && (
        <div className="mb-6"><Notice>{t("طلب بطاقة: لا يمكن تأكيده حتى تؤكد بوابة الدفع العملية عبر إشعار موقّع. لا يمكن تعليمه كمدفوع يدوياً.", "Card order: it cannot be confirmed until the payment gateway confirms via a signed webhook. It cannot be marked paid manually.")}</Notice></div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {canManage && <Panel title={t("إجراءات الطلب", "Order actions")}><StatusActions orderId={o.id} allowed={allowed} couriers={couriers} /></Panel>}

          <Panel title={t("المنتجات", "Items")} pad={false}>
            <Table>
              <thead><tr><th>{t("المنتج", "Product")}</th><th>SKU</th><th>{t("السعر", "Price")}</th><th>{t("الكمية", "Qty")}</th><th>{t("الإجمالي", "Total")}</th>{showCommission && <th>{t("العمولة", "Commission")}</th>}</tr></thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id}>
                    <td><Link href={`/admin/products/${it.productId}`} className="hover:underline">{l === "ar" ? it.nameAr : it.nameEn}</Link>{(it.variantNameAr || it.variantNameEn) && <span className="block text-xs text-plum-500">{l === "ar" ? it.variantNameAr : it.variantNameEn}</span>}</td>
                    <td className="font-mono text-xs" dir="ltr">{it.sku}</td>
                    <td className="tabular-nums">{m(it.unitPrice)}</td>
                    <td className="tabular-nums">{it.quantity}</td>
                    <td className="tabular-nums">{m(it.lineTotal)}{it.discountShare > 0 && <span className="block text-xs text-success">−{m(it.discountShare)}</span>}</td>
                    {showCommission && <td className="tabular-nums">{m(it.commissionAmount)}</td>}
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="space-y-1.5 border-t border-ivory-200 p-5 text-sm">
              <div className="flex justify-between"><dt>{t("المجموع الفرعي", "Subtotal")}</dt><dd className="tabular-nums">{m(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-success"><dt>{t("الخصم", "Discount")} ({o.couponCode})</dt><dd className="tabular-nums">−{m(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>{t("التوصيل", "Delivery")}</dt><dd className="tabular-nums">{m(o.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-ivory-200 pt-2 font-semibold"><dt>{t("الإجمالي", "Total")}</dt><dd className="tabular-nums">{m(o.total)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-danger"><dt>{t("مُسترد", "Refunded")}</dt><dd className="tabular-nums">−{m(refunded)}</dd></div>}
            </dl>
          </Panel>

          <Panel title={t("الدفع", "Payment")}>
            <div className="space-y-4">
              {o.payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{paymentMethodLabel(l, p.method)} · <span className="font-mono text-xs">{p.provider}</span>{p.providerRef && <span className="ms-2 font-mono text-xs text-plum-500" dir="ltr">{p.providerRef}</span>}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={paymentTone(p.status)}>{paymentStatusLabel(l, p.status)}</Badge>
                    {p.verifiedByProvider && <Badge tone="success"><Icon name="shield" className="h-3 w-3" />{t("موثّق من البوابة", "Gateway-verified")}</Badge>}
                    {p.collectedBy && <span className="text-xs text-plum-500">{t("حُصّل بواسطة", "Collected by")} {p.collectedBy} · {p.collectedAt && fmt.format(p.collectedAt)}</span>}
                  </span>
                </div>
              ))}
              {canManage && o.paymentMethod === "COD" && o.paymentStatus === "UNPAID" && !["CANCELED", "PENDING_CONFIRMATION"].includes(o.status) && (
                <div className="border-t border-ivory-200 pt-4"><CodForm orderId={o.id} /></div>
              )}
              {can(admin, "orders.refund") && ["PAID", "PARTIALLY_REFUNDED"].includes(o.paymentStatus) && o.total - refunded > 0 && (
                <div className="border-t border-ivory-200 pt-4">
                  <p className="mb-2 text-xs text-plum-500">{o.paymentMethod === "CARD" ? t("سيُنفَّذ الاسترداد عبر بوابة الدفع.", "The refund will be executed through the payment gateway.") : t("يسجّل استرداد نقدي تم تسليمه للعميلة.", "Records a cash refund handed to the customer.")}</p>
                  <RefundForm orderId={o.id} max={o.total - refunded} />
                </div>
              )}
              {o.refunds.length > 0 && (
                <ul className="space-y-1 border-t border-ivory-200 pt-3 text-xs">
                  {o.refunds.map((r) => <li key={r.id} className="flex justify-between"><span>{fmt.format(r.createdAt)} · {r.reason}</span><span className="tabular-nums">−{m(r.amount)} · {r.status}</span></li>)}
                </ul>
              )}
            </div>
          </Panel>

          <Panel title={t("السجل والملاحظات", "History & notes")}>
            <NoteForm orderId={o.id} />
            <ul className="mt-5 space-y-3 text-sm">
              {[...o.history.map((h) => ({ at: h.createdAt, key: h.id, node: (
                <><Badge tone={h.kind === "PAYMENT" ? "gold" : "neutral"}>{h.kind === "PAYMENT" ? t("دفع", "Payment") : t("حالة", "Status")}</Badge>{" "}
                  {h.fromValue && <>{h.kind === "PAYMENT" ? paymentStatusLabel(l, h.fromValue) : statusLabel(l, h.fromValue)} → </>}
                  <strong>{h.kind === "PAYMENT" ? paymentStatusLabel(l, h.toValue) : statusLabel(l, h.toValue)}</strong>
                  <span className="text-plum-500"> · {h.actorType}{h.note && ` · ${h.note}`}</span></>
              ) })), ...o.notes.map((n) => ({ at: n.createdAt, key: n.id, node: <><Icon name="chat" className="inline h-3.5 w-3.5" /> <strong>{n.authorName}:</strong> {n.body}</> }))]
                .sort((a, b) => +b.at - +a.at)
                .map((e) => <li key={e.key} className="flex gap-3"><span className="w-32 shrink-0 text-xs text-plum-500">{fmt.format(e.at)}</span><span>{e.node}</span></li>)}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("العميلة", "Customer")}>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{o.fullName}</p>
              <p><a href={`tel:${o.phone}`} dir="ltr" className="underline">{o.phone}</a> · <a href={`https://wa.me/${o.phone.replace(/^0/, "970")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></p>
              {o.email && <p dir="ltr" className="text-start">{o.email}</p>}
              {o.customer ? <Link href={`/admin/customers/${o.customer.id}`} className="text-xs underline">{t("ملف العميلة", "Customer profile")}</Link> : <p className="text-xs text-plum-500">{t("طلب ضيف", "Guest order")}</p>}
            </div>
          </Panel>
          <Panel title={t("عنوان التوصيل", "Delivery address")}>
            <div className="space-y-1 text-sm">
              <p>{o.governorateName} · {o.cityName}</p>
              <p>{o.street}</p><p>{o.addressDetails}</p>
              {o.landmark && <p className="text-plum-500">{t("معلم:", "Landmark:")} {o.landmark}</p>}
              {o.deliveryNotes && <p className="rounded-lg bg-gold/10 p-2 text-gold-700">{o.deliveryNotes}</p>}
            </div>
            {canManage && o.delivery && <div className="mt-5 border-t border-ivory-200 pt-4"><DeliveryForm orderId={o.id} couriers={couriers} delivery={o.delivery} /></div>}
          </Panel>
          <Panel title={t("الشريك والعمولة", "Partner & commission")}>
            <div className="space-y-2 text-sm">
              <p>{o.partner.name}</p>
              {showCommission && o.commission && (
                <>
                  <p className="flex items-center justify-between"><span>{t("عمولة ديلا", "DELLA commission")}</span><span className="font-semibold tabular-nums">{m(o.commission.amount)}</span></p>
                  <p className="flex items-center justify-between"><span>{t("الأساس", "Base")}</span><span className="tabular-nums">{m(o.commission.baseAmount)}</span></p>
                  <Badge tone={commissionTone(o.commission.status)}>{commissionStatusLabel(l, o.commission.status)}</Badge>
                  {o.commission.voidReason && <p className="text-xs text-plum-500">{o.commission.voidReason}</p>}
                  <p className="text-xs text-plum-500">{t("تُستحق العمولة بعد التوصيل وتحصيل الدفع.", "Earned once delivered and payment collected.")}</p>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
