import { saveCoupon } from "@/app/admin/actions/business";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { asStringArray } from "@/lib/utils";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Check, Field, PageHeader, Panel, Select } from "@/components/admin/ui";

export const metadata = { title: "Promotions" };

export default async function CouponsPage() {
  await requireAdminPage("promotions.manage");
  const t = await getT();
  const l = t.locale;
  const [coupons, products, categories] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, nameAr: true, nameEn: true } }),
    db.category.findMany({ where: { archived: false }, select: { id: true, nameAr: true, nameEn: true } }),
  ]);
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16) : "");

  type C = (typeof coupons)[number];
  const CouponForm = ({ c }: { c?: C }) => {
    const pids = asStringArray(c?.productIds);
    const cids = asStringArray(c?.categoryIds);
    return (
      <ActionForm action={saveCoupon} className="grid gap-3 sm:grid-cols-3" resetOnSuccess={!c}>
        {c && <input type="hidden" name="id" value={c.id} />}
        <Field label={t("الكود", "Code")} name="code" defaultValue={c?.code} required ltr className="font-mono" />
        <Select label={t("النوع", "Type")} name="type" defaultValue={c?.type ?? "PERCENT"} options={[{ value: "PERCENT", label: t("نسبة %", "Percent %") }, { value: "FIXED", label: t("مبلغ ثابت ₪", "Fixed ₪") }, { value: "FREE_SHIPPING", label: t("توصيل مجاني", "Free shipping") }]} />
        <Field label={t("القيمة (% أو ₪)", "Value (% or ₪)")} name="value" defaultValue={c ? (c.type === "FIXED" ? c.value / 100 : c.value) : ""} inputMode="decimal" ltr />
        <Field label={t("يبدأ", "Starts")} name="startsAt" type="datetime-local" defaultValue={d(c?.startsAt ?? null)} />
        <Field label={t("ينتهي", "Ends")} name="endsAt" type="datetime-local" defaultValue={d(c?.endsAt ?? null)} />
        <Field label={t("الحد الأدنى للطلب ₪", "Minimum order ₪")} name="minOrder" defaultValue={c?.minOrder ? c.minOrder / 100 : ""} inputMode="decimal" ltr />
        <Field label={t("حد الاستخدام الكلي", "Total usage limit")} name="usageLimit" type="number" defaultValue={c?.usageLimit ?? ""} />
        <Field label={t("لكل عميلة (برقم الجوال)", "Per customer (by phone)")} name="perCustomerLimit" type="number" defaultValue={c?.perCustomerLimit ?? ""} />
        <div className="space-y-2 pt-6">
          <Check label={t("لا يُطبّق على المنتجات المخفّضة", "Exclude sale items")} name="excludeSaleItems" defaultChecked={c?.excludeSaleItems} />
          <Check label={t("فعّال", "Active")} name="active" defaultChecked={c?.active ?? true} />
        </div>
        <label className="sm:col-span-3">
          <span className="label">{t("حصر على منتجات (اختياري)", "Restrict to products (optional)")}</span>
          <select name="productIds" multiple defaultValue={pids} className="field h-24 text-xs">{products.map((p) => <option key={p.id} value={p.id}>{l === "ar" ? p.nameAr : p.nameEn}</option>)}</select>
        </label>
        <label className="sm:col-span-3">
          <span className="label">{t("حصر على فئات (اختياري)", "Restrict to categories (optional)")}</span>
          <select name="categoryIds" multiple defaultValue={cids} className="field h-20 text-xs">{categories.map((p) => <option key={p.id} value={p.id}>{l === "ar" ? p.nameAr : p.nameEn}</option>)}</select>
        </label>
        <div><button className="btn-primary btn-sm h-9">{c ? t("حفظ", "Save") : t("إنشاء كوبون", "Create coupon")}</button></div>
      </ActionForm>
    );
  };

  return (
    <>
      <PageHeader title={t("العروض والكوبونات", "Promotions & coupons")} description={t("كوبون واحد لكل طلب (لا تراكم). تُتحقق الأهلية على الخادم.", "One coupon per order (no stacking). Eligibility is validated server-side.")} />
      <div className="space-y-4">
        {coupons.map((c) => (
          <Panel key={c.id} title={<span className="flex items-center gap-2 font-mono">{c.code}
            <Badge tone={c.active ? "success" : "neutral"}>{c.active ? t("فعّال", "Active") : t("متوقف", "Inactive")}</Badge>
            <span className="font-sans text-xs font-normal text-plum-500">{c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? formatMoney(c.value, l) : t("توصيل مجاني", "Free shipping")} · {t("استُخدم", "used")} {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</span>
          </span>}>
            <details><summary className="cursor-pointer text-sm text-plum-600">{t("تعديل", "Edit")}</summary><div className="mt-4"><CouponForm c={c} /></div></details>
          </Panel>
        ))}
        <Panel title={t("كوبون جديد", "New coupon")}><CouponForm /></Panel>
      </div>
      <p className="mt-4 text-xs text-plum-500">{t("لعرض لافتة ترويجية في الرئيسية، عدّلي قسم «العروض» في صفحة محتوى الموقع.", "To show a promotional banner on the homepage, edit the “Offers” section under Site content.")}</p>
    </>
  );
}
