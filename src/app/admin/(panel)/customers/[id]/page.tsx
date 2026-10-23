import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/app/admin/actions/system";
import { can, requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, PageHeader, Panel, Select, Table, TextArea, orderTone } from "@/components/admin/ui";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("customers.view");
  const [{ id }, t] = await Promise.all([params, getT()]);
  const l = t.locale;
  const c = await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } }, addresses: { include: { locality: { include: { governorate: true } } } }, _count: { select: { wishlist: true, reviews: true } } },
  });
  if (!c) notFound();
  const spend = c.orders.filter((o) => o.status !== "CANCELED" && o.status !== "RETURNED").reduce((s, o) => s + o.total, 0);
  return (
    <>
      <PageHeader back={{ href: "/admin/customers", label: t("العملاء", "Customers") }} title={c.name} description={`${c.email ?? ""} ${c.phone ? `· ${c.phone}` : ""}`} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={t(`الطلبات (${c.orders.length}) · ${formatMoney(spend, l)}`, `Orders (${c.orders.length}) · ${formatMoney(spend, l)}`)} pad={false}>
          <Table>
            <thead><tr><th>{t("الطلب", "Order")}</th><th>{t("التاريخ", "Date")}</th><th>{t("الحالة", "Status")}</th><th>{t("الدفع", "Payment")}</th><th>{t("الإجمالي", "Total")}</th></tr></thead>
            <tbody>{c.orders.map((o) => (
              <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-mono hover:underline" dir="ltr">{o.number}</Link></td><td className="text-xs">{o.createdAt.toISOString().slice(0, 10)}</td><td><Badge tone={orderTone(o.status)}>{statusLabel(l, o.status)}</Badge></td><td className="text-xs">{paymentStatusLabel(l, o.paymentStatus)}</td><td className="tabular-nums">{formatMoney(o.total, l)}</td></tr>
            ))}</tbody>
          </Table>
        </Panel>
        <div className="space-y-6">
          <Panel title={t("الحساب", "Account")}>
            <p className="mb-4 text-xs text-plum-500">{t(`المفضلة: ${c._count.wishlist} · المراجعات: ${c._count.reviews} · منذ ${c.createdAt.toISOString().slice(0, 10)}`, `Wishlist: ${c._count.wishlist} · Reviews: ${c._count.reviews} · Since ${c.createdAt.toISOString().slice(0, 10)}`)}</p>
            {can(admin, "customers.manage") ? (
              <ActionForm action={updateCustomer} className="space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <Select label={t("حالة الحساب", "Account status")} name="status" defaultValue={c.status} options={[
                  { value: "ACTIVE", label: t("فعّال", "Active") }, { value: "SUSPENDED", label: t("موقوف", "Suspended") },
                  { value: "DELETION_REQUESTED", label: t("طلب حذف", "Deletion requested") }, { value: "DELETED", label: t("محذوف (إخفاء البيانات الشخصية)", "Deleted (anonymise personal data)") },
                ]} />
                <TextArea label={t("ملاحظات الدعم", "Support notes")} name="supportNotes" defaultValue={c.supportNotes} rows={4} />
                <button className="btn-primary btn-sm h-9">{t("حفظ", "Save")}</button>
              </ActionForm>
            ) : <p className="text-sm">{c.status}</p>}
          </Panel>
          <Panel title={t("العناوين المحفوظة", "Saved addresses")}>
            {c.addresses.length ? <ul className="space-y-2 text-sm">{c.addresses.map((a) => <li key={a.id} className="rounded-lg bg-ivory-100 p-3">{a.fullName} · <span dir="ltr">{a.phone}</span><br />{l === "ar" ? a.locality.governorate.nameAr : a.locality.governorate.nameEn} · {l === "ar" ? a.locality.nameAr : a.locality.nameEn}<br />{a.street} — {a.details}</li>)}</ul> : <p className="text-sm text-plum-500">{t("لا يوجد", "None")}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
