import Link from "next/link";
import { addLocality, saveCourier, saveZone, toggleGovernorate, updateLocality } from "@/app/admin/actions/business";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Check, Field, Notice, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  await requireAdminPage("delivery.manage");
  const t = await getT();
  const l = t.locale;
  const [zones, govs, couriers, byGov] = await Promise.all([
    db.deliveryZone.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { localities: true } } } }),
    db.governorate.findMany({ orderBy: { sortOrder: "asc" }, include: { localities: { orderBy: { nameEn: "asc" } } } }),
    db.courier.findMany(),
    db.order.groupBy({ by: ["governorateName"], _count: true, where: { status: { in: ["CONFIRMED", "PREPARING", "SHIPPED", "OUT_FOR_DELIVERY"] } } }),
  ]);
  type Z = (typeof zones)[number];
  const ZoneForm = ({ z }: { z?: Z }) => (
    <ActionForm action={saveZone} className="grid gap-3 sm:grid-cols-4" resetOnSuccess={!z}>
      {z && <input type="hidden" name="id" value={z.id} />}
      <Field label={t("الاسم عربي", "Name (AR)")} name="nameAr" defaultValue={z?.nameAr} required />
      <Field label={t("الاسم إنجليزي", "Name (EN)")} name="nameEn" defaultValue={z?.nameEn} required ltr />
      <Field label={t("رسوم التوصيل ₪", "Delivery fee ₪")} name="fee" defaultValue={z ? z.fee / 100 : ""} required inputMode="decimal" ltr />
      <Field label={t("مجاني فوق ₪ (اختياري)", "Free above ₪ (optional)")} name="freeShippingMin" defaultValue={z?.freeShippingMin ? z.freeShippingMin / 100 : ""} inputMode="decimal" ltr />
      <Field label={t("أقل مدة (أيام)", "Min days")} name="etaMinDays" type="number" defaultValue={z?.etaMinDays ?? 1} />
      <Field label={t("أقصى مدة (أيام)", "Max days")} name="etaMaxDays" type="number" defaultValue={z?.etaMaxDays ?? 3} />
      <Field label={t("الترتيب", "Order")} name="sortOrder" type="number" defaultValue={z?.sortOrder ?? 0} />
      <div className="space-y-2 pt-6">
        <Check label={t("الدفع عند الاستلام متاح", "COD available")} name="codAvailable" defaultChecked={z?.codAvailable ?? true} />
        <Check label={t("فعّالة", "Active")} name="active" defaultChecked={z?.active ?? true} />
      </div>
      <div><button className="btn-primary btn-sm h-9">{z ? t("حفظ", "Save") : t("إضافة منطقة", "Add zone")}</button></div>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title={t("التوصيل", "Delivery")} description={t("المناطق والرسوم والمدن المخدومة. تُحسب الرسوم على الخادم.", "Zones, fees and served localities. Fees are calculated server-side.")} />
      <div className="mb-6"><Notice>{t("الرسوم والمناطق المُدخلة مبدئياً قيم نموذجية. راجعيها مع الشريك/شركة التوصيل قبل الإطلاق. المدن غير المفعّلة لا يمكن الطلب إليها.", "Seeded fees and zones are sample values. Review them with the partner/courier before launch. Disabled localities cannot be ordered to.")}</Notice></div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">{t("مناطق التوصيل", "Delivery zones")}</h2>
          {zones.map((z) => (
            <Panel key={z.id} title={<span className="flex items-center gap-2">{l === "ar" ? z.nameAr : z.nameEn} <Badge tone={z.active ? "success" : "neutral"}>{z.active ? t("فعّالة", "Active") : t("متوقفة", "Inactive")}</Badge>
              <span className="text-xs font-normal text-plum-500">{formatMoney(z.fee, l)} · {z.etaMinDays}–{z.etaMaxDays} {t("أيام", "days")} · {z._count.localities} {t("مدينة", "localities")}</span></span>}>
              <details><summary className="cursor-pointer text-sm text-plum-600">{t("تعديل", "Edit")}</summary><div className="mt-4"><ZoneForm z={z} /></div></details>
            </Panel>
          ))}
          <Panel title={t("منطقة جديدة", "New zone")}><ZoneForm /></Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("طلبات قيد التوصيل حسب المحافظة", "Orders in progress by governorate")}>
            {byGov.length ? <ul className="space-y-1 text-sm">{byGov.map((g) => <li key={g.governorateName} className="flex justify-between"><Link className="hover:underline" href={`/admin/orders?gov=${encodeURIComponent(g.governorateName)}`}>{g.governorateName}</Link><span className="tabular-nums">{g._count}</span></li>)}</ul> : <p className="text-sm text-plum-500">{t("لا يوجد", "None")}</p>}
          </Panel>
          <Panel title={t("شركات التوصيل", "Couriers")}>
            <ul className="mb-4 space-y-2">
              {couriers.map((c) => (
                <li key={c.id}>
                  <ActionForm action={saveCourier} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" defaultValue={c.name} className="field h-9 flex-1 text-sm" aria-label={t("الاسم", "Name")} />
                    <input name="phone" defaultValue={c.phone ?? ""} placeholder={t("الهاتف", "Phone")} dir="ltr" className="field h-9 w-32 text-sm" />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={c.active} className="accent-plum" />{t("فعّال", "Active")}</label>
                    <button className="btn-secondary btn-sm h-9">{t("حفظ", "Save")}</button>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={saveCourier} className="flex gap-2" resetOnSuccess>
              <input name="name" required placeholder={t("شركة توصيل جديدة", "New courier")} className="field h-9 flex-1 text-sm" />
              <input type="hidden" name="active" value="on" />
              <button className="btn-primary btn-sm h-9">{t("إضافة", "Add")}</button>
            </ActionForm>
          </Panel>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold">{t("المحافظات والمدن والقرى", "Governorates, cities & villages")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {govs.map((g) => (
          <Panel key={g.id} title={<span className="flex items-center gap-2">{l === "ar" ? g.nameAr : g.nameEn} {!g.active && <Badge tone="danger">{t("معطّلة", "Disabled")}</Badge>} <span className="text-xs font-normal text-plum-500">{g.localities.filter((x) => x.active).length}/{g.localities.length} {t("مفعّلة", "enabled")}</span></span>}
            actions={<ActionForm action={toggleGovernorate}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="active" value={g.active ? "0" : "1"} /><button className="text-xs underline">{g.active ? t("تعطيل المحافظة", "Disable") : t("تفعيل", "Enable")}</button></ActionForm>}>
            <details>
              <summary className="cursor-pointer text-sm text-plum-600">{t("إدارة المدن", "Manage localities")}</summary>
              <ul className="mt-3 space-y-2">
                {g.localities.map((x) => (
                  <li key={x.id}>
                    <ActionForm action={updateLocality} className="flex flex-wrap items-center gap-2 text-xs">
                      <input type="hidden" name="id" value={x.id} />
                      <span className="w-28 font-medium">{l === "ar" ? x.nameAr : x.nameEn}</span>
                      <select name="zoneId" defaultValue={x.zoneId ?? ""} className="field h-8 w-40 px-2 text-xs" aria-label={t("المنطقة", "Zone")}>
                        <option value="">{t("بدون منطقة", "No zone")}</option>
                        {zones.map((z) => <option key={z.id} value={z.id}>{l === "ar" ? z.nameAr : z.nameEn}</option>)}
                      </select>
                      <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={x.active} className="accent-plum" />{t("مخدومة", "Served")}</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="codAvailable" defaultChecked={x.codAvailable} className="accent-plum" />COD</label>
                      <button className="btn-secondary btn-sm h-7 px-3 text-xs">{t("حفظ", "Save")}</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
              <ActionForm action={addLocality} className="mt-4 flex flex-wrap gap-2 border-t border-ivory-200 pt-3" resetOnSuccess>
                <input type="hidden" name="governorateId" value={g.id} />
                <input name="nameAr" required placeholder={t("اسم بالعربية", "Arabic name")} className="field h-8 w-32 text-xs" />
                <input name="nameEn" required placeholder="English name" dir="ltr" className="field h-8 w-32 text-xs" />
                <select name="zoneId" className="field h-8 w-36 px-2 text-xs" aria-label={t("المنطقة", "Zone")}><option value="">{t("بدون منطقة", "No zone")}</option>{zones.map((z) => <option key={z.id} value={z.id}>{l === "ar" ? z.nameAr : z.nameEn}</option>)}</select>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" className="accent-plum" />{t("مخدومة", "Served")}</label>
                <button className="btn-primary btn-sm h-8 text-xs">{t("إضافة", "Add")}</button>
              </ActionForm>
            </details>
          </Panel>
        ))}
      </div>
    </>
  );
}
