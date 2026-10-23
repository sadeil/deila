import { savePartner } from "@/app/admin/actions/business";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Check, Field, Notice, PageHeader, Panel, Select, TextArea } from "@/components/admin/ui";

export const metadata = { title: "Retail partners" };

export default async function PartnersPage() {
  await requireAdminPage("partners.manage");
  const t = await getT();
  const l = t.locale;
  const partners = await db.partner.findMany({
    include: { _count: { select: { products: true, orders: true, staff: true } }, settlements: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  type P = (typeof partners)[number];
  const PartnerForm = ({ p }: { p?: P }) => (
    <ActionForm action={savePartner} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label={t("اسم الشريك", "Partner name")} name="name" defaultValue={p?.name} required className="sm:col-span-2" />
      <Field label={t("مسؤول التواصل", "Contact person")} name="contactName" defaultValue={p?.contactName} />
      <Field label={t("الهاتف", "Phone")} name="phone" defaultValue={p?.phone} ltr />
      <Field label={t("البريد", "Email")} name="email" type="email" defaultValue={p?.email} ltr />
      <Field label={t("العنوان", "Address")} name="address" defaultValue={p?.address} />
      <Select label={t("نوع العمولة", "Commission type")} name="commissionType" defaultValue={p?.commissionType ?? "PERCENT"} options={[{ value: "PERCENT", label: t("نسبة مئوية %", "Percentage %") }, { value: "FIXED", label: t("مبلغ ثابت لكل قطعة ₪", "Fixed per unit ₪") }]} />
      <Field label={t("القيمة (% أو ₪)", "Value (% or ₪)")} name="commissionValue" defaultValue={p ? p.commissionValue / 100 : 10} inputMode="decimal" ltr required />
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
        <Check label={t("الشريك مسؤول عن تجهيز الطلبات", "Partner handles fulfilment")} name="fulfillmentByPartner" defaultChecked={p?.fulfillmentByPartner ?? true} />
        <Check label={t("الشريك مسؤول عن التوصيل", "Partner handles delivery")} name="deliveryByPartner" defaultChecked={p?.deliveryByPartner ?? true} />
        <Check label={t("الشريك مسؤول عن الضمان", "Partner handles warranty")} name="warrantyByPartner" defaultChecked={p?.warrantyByPartner ?? true} />
        <Check label={t("الشريك يحصّل المدفوعات (التاجر المسجّل)", "Partner collects payment (merchant of record)")} name="collectsPayment" defaultChecked={p?.collectsPayment ?? true} />
        <Check label={t("فعّال", "Active")} name="active" defaultChecked={p?.active ?? true} />
      </div>
      <TextArea label={t("ملاحظات الاتفاقية", "Agreement notes")} name="notes" defaultValue={p?.notes} className="sm:col-span-2" />
      <div><button className="btn-primary btn-sm h-9">{p ? t("حفظ", "Save") : t("إضافة شريك", "Add partner")}</button></div>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title={t("الشركاء التجاريون", "Retail partners")} description={t("حالياً شريك واحد، والنظام جاهز لعدة شركاء.", "Currently one partner; the system supports several.")} />
      <div className="mb-6"><Notice>{t("نسبة العمولة الحالية قيمة أولية — حدّثيها وفق الاتفاقية الموقّعة. تُطبَّق على الطلبات الجديدة فقط.", "The current commission rate is a starting value — update it to the signed agreement. Changes apply to new orders only.")}</Notice></div>
      <div className="space-y-6">
        {partners.map((p) => (
          <Panel key={p.id} title={<span className="flex items-center gap-2">{p.name}{!p.active && <Badge>{t("غير فعّال", "Inactive")}</Badge>}</span>}
            actions={<span className="text-xs text-plum-500">{p._count.products} {t("منتج", "products")} · {p._count.orders} {t("طلب", "orders")} · {p._count.staff} {t("حساب", "logins")}</span>}>
            <PartnerForm p={p} />
            {p.settlements.length > 0 && (
              <div className="mt-6 border-t border-ivory-200 pt-4">
                <p className="mb-2 text-xs font-semibold">{t("آخر التسويات", "Recent settlements")}</p>
                <ul className="space-y-1 text-xs">{p.settlements.map((s) => <li key={s.id}>{s.createdAt.toISOString().slice(0, 10)} · {formatMoney(s.amount, l)} · {s.status} {s.reference && `· ${s.reference}`}</li>)}</ul>
              </div>
            )}
            <p className="mt-4 text-xs text-plum-500">{t("لمنح الشريك وصولاً مقيّداً: أنشئي له حساباً بدور «شريك التنفيذ» من صفحة الموظفين.", "To give the partner restricted access, create a login with the “Fulfillment Partner” role under Staff.")}</p>
          </Panel>
        ))}
        <Panel title={t("شريك جديد", "New partner")}><PartnerForm /></Panel>
      </div>
    </>
  );
}
