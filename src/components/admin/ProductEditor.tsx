"use client";
import { useState } from "react";
import { saveProduct } from "@/app/admin/actions/products";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";
import { ActionForm } from "./ActionForm";
import { ImageManager, type Img } from "./ImageUploader";

type Variant = { id?: string; sku: string; nameAr: string; nameEn: string; colorHex: string | null; price: number | null; active: boolean; isDefault: boolean };
type Spec = { labelAr: string; labelEn: string; valueAr: string; valueEn: string };
export type ProductInput = {
  id?: string; nameAr: string; nameEn: string; slug: string; sku: string; model: string;
  shortAr: string; shortEn: string; descAr: string; descEn: string; featuresAr: string; featuresEn: string;
  price: string; compareAtPrice: string; priceVerified: boolean; isDemo: boolean; status: string;
  categoryId: string; brandId: string; partnerId: string; featured: boolean; newArrival: boolean; returnEligible: boolean;
  warrantyAr: string; warrantyEn: string; videoUrl: string; seoTitle: string; seoDesc: string;
  commissionType: string; commissionValue: string;
  images: Img[]; variants: Variant[]; specs: Spec[];
};

const inp = "field h-10 text-sm";

export function ProductEditor({ initial, categories, brands, partners }: {
  initial: ProductInput;
  categories: { id: string; label: string }[];
  brands: { id: string; label: string }[];
  partners: { id: string; label: string }[];
}) {
  const t = useT();
  const [images, setImages] = useState<Img[]>(initial.images);
  const [variants, setVariants] = useState<Variant[]>(initial.variants.length ? initial.variants : [{ sku: "", nameAr: "افتراضي", nameEn: "Default", colorHex: null, price: null, active: true, isDefault: true }]);
  const [specs, setSpecs] = useState<Spec[]>(initial.specs);
  const [tab, setTab] = useState<"ar" | "en">(t.locale);
  const upV = (i: number, p: Partial<Variant>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...p } : p.isDefault ? { ...v, isDefault: false } : v)));
  const upS = (i: number, p: Partial<Spec>) => setSpecs((ss) => ss.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const L = (ar: string, en: string, el: React.ReactNode) => <label className="block"><span className="label">{t(ar, en)}</span>{el}</label>;

  return (
    <ActionForm action={saveProduct} className="grid gap-6 xl:grid-cols-[1fr_340px]" success={t("تم حفظ المنتج", "Product saved")}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.labelAr || s.labelEn))} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("المحتوى", "Content")}</h2>
            <div className="flex rounded-full bg-ivory-100 p-0.5 text-xs">
              {(["ar", "en"] as const).map((x) => <button type="button" key={x} onClick={() => setTab(x)} className={cn("rounded-full px-3 py-1", tab === x && "bg-white font-semibold shadow-soft")}>{x === "ar" ? "العربية" : "English"}</button>)}
            </div>
          </div>
          {(["ar", "en"] as const).map((lang) => {
            const sfx = lang === "ar" ? "Ar" : "En";
            const dir = lang === "ar" ? "rtl" : "ltr";
            const v = initial as unknown as Record<string, string>;
            return (
              <div key={lang} className={cn("grid gap-4", tab !== lang && "hidden")} dir={dir}>
                {L("الاسم", "Name", <input name={`name${sfx}`} defaultValue={v[`name${sfx}`]} required className={inp} />)}
                {L("وصف قصير", "Short description", <input name={`short${sfx}`} defaultValue={v[`short${sfx}`]} className={inp} />)}
                {L("الوصف الكامل", "Full description", <textarea name={`desc${sfx}`} defaultValue={v[`desc${sfx}`]} rows={6} className="field text-sm" />)}
                {L("المزايا الرئيسية (سطر لكل ميزة)", "Key features (one per line)", <textarea name={`features${sfx}`} defaultValue={v[`features${sfx}`]} rows={4} className="field text-sm" />)}
                {L("الضمان", "Warranty", <input name={`warranty${sfx}`} defaultValue={v[`warranty${sfx}`]} className={inp} />)}
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("الصور", "Images")}</h2>
          <ImageManager value={images} onChange={setImages} />
          <div className="mt-4">{L("رابط فيديو (YouTube/Vimeo)", "Video URL (YouTube/Vimeo)", <input name="videoUrl" defaultValue={initial.videoUrl} dir="ltr" placeholder="https://www.youtube.com/watch?v=…" className={inp} />)}</div>
        </section>

        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("الخيارات (ألوان / موديلات)", "Variants (colours / models)")}</h2>
            <button type="button" className="btn-secondary btn-sm h-8" onClick={() => setVariants((vs) => [...vs, { sku: "", nameAr: "", nameEn: "", colorHex: null, price: null, active: true, isDefault: false }])}><Icon name="plus" className="h-3.5 w-3.5" />{t("خيار", "Variant")}</button>
          </div>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl bg-ivory-100/60 p-3 sm:grid-cols-[1fr_1fr_1.2fr_90px_90px_auto]">
                <input value={v.nameAr} onChange={(e) => upV(i, { nameAr: e.target.value })} placeholder={t("الاسم عربي", "Name (AR)")} className={inp} aria-label="Name AR" />
                <input value={v.nameEn} onChange={(e) => upV(i, { nameEn: e.target.value })} placeholder={t("الاسم إنجليزي", "Name (EN)")} className={inp} dir="ltr" aria-label="Name EN" />
                <input value={v.sku} onChange={(e) => upV(i, { sku: e.target.value.toUpperCase() })} placeholder="SKU" className={cn(inp, "font-mono")} dir="ltr" aria-label="SKU" required />
                <span className="flex items-center gap-1">
                  <input type="color" value={v.colorHex ?? "#ffffff"} onChange={(e) => upV(i, { colorHex: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-ivory-300" aria-label={t("اللون", "Colour")} />
                  {v.colorHex && <button type="button" onClick={() => upV(i, { colorHex: null })} className="text-xs text-plum-500" aria-label={t("بدون لون", "No colour")}>×</button>}
                </span>
                <input value={v.price == null ? "" : (v.price / 100).toString()} onChange={(e) => upV(i, { price: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} placeholder={t("سعر خاص", "Own price")} inputMode="decimal" className={inp} dir="ltr" aria-label={t("سعر الخيار", "Variant price")} />
                <span className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1"><input type="radio" checked={v.isDefault} onChange={() => upV(i, { isDefault: true })} className="accent-plum" />{t("افتراضي", "Default")}</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={v.active} onChange={(e) => upV(i, { active: e.target.checked })} className="accent-plum" />{t("فعّال", "Active")}</label>
                  {variants.length > 1 && <button type="button" onClick={() => setVariants((vs) => vs.filter((_, k) => k !== i))} className="text-danger" aria-label={t("حذف", "Remove")}><Icon name="trash" className="h-4 w-4" /></button>}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-plum-500">{t("المخزون لكل خيار يُدار من صفحة المخزون. الخيارات المرتبطة بطلبات سابقة تُعطَّل ولا تُحذف.", "Stock per variant is managed in Inventory. Variants used by past orders are deactivated, not deleted.")}</p>
        </section>

        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("المواصفات الفنية", "Technical specifications")}</h2>
            <button type="button" className="btn-secondary btn-sm h-8" onClick={() => setSpecs((s) => [...s, { labelAr: "", labelEn: "", valueAr: "", valueEn: "" }])}><Icon name="plus" className="h-3.5 w-3.5" />{t("مواصفة", "Spec")}</button>
          </div>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <input value={s.labelAr} onChange={(e) => upS(i, { labelAr: e.target.value })} placeholder={t("البند (ع)", "Label (AR)")} className={inp} />
                <input value={s.valueAr} onChange={(e) => upS(i, { valueAr: e.target.value })} placeholder={t("القيمة (ع)", "Value (AR)")} className={inp} />
                <input value={s.labelEn} onChange={(e) => upS(i, { labelEn: e.target.value })} placeholder="Label (EN)" dir="ltr" className={inp} />
                <input value={s.valueEn} onChange={(e) => upS(i, { valueEn: e.target.value })} placeholder="Value (EN)" dir="ltr" className={inp} />
                <button type="button" onClick={() => setSpecs((ss) => ss.filter((_, k) => k !== i))} className="px-2 text-danger" aria-label={t("حذف", "Remove")}><Icon name="trash" className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">SEO</h2>
          <div className="grid gap-4">
            {L("الرابط (slug)", "URL slug", <input name="slug" defaultValue={initial.slug} dir="ltr" className={cn(inp, "font-mono")} placeholder="auto from English name" />)}
            {L("عنوان SEO", "SEO title", <input name="seoTitle" defaultValue={initial.seoTitle} maxLength={120} className={inp} />)}
            {L("وصف SEO", "SEO description", <textarea name="seoDesc" defaultValue={initial.seoDesc} maxLength={300} rows={2} className="field text-sm" />)}
          </div>
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <div className="grid gap-4">
            {L("الحالة", "Status", <select name="status" defaultValue={initial.status} className={inp}><option value="DRAFT">{t("مسودة", "Draft")}</option><option value="PUBLISHED">{t("منشور", "Published")}</option><option value="ARCHIVED">{t("مؤرشف", "Archived")}</option></select>)}
            <button className="btn-primary h-11 w-full">{t("حفظ المنتج", "Save product")}</button>
          </div>
        </section>
        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("السعر", "Pricing")}</h2>
          <div className="grid gap-4">
            {L("السعر ₪", "Price ₪", <input name="price" defaultValue={initial.price} required inputMode="decimal" dir="ltr" className={inp} />)}
            {L("السعر قبل الخصم ₪ (اختياري)", "Compare-at price ₪ (optional)", <input name="compareAtPrice" defaultValue={initial.compareAtPrice} inputMode="decimal" dir="ltr" className={inp} />)}
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="priceVerified" defaultChecked={initial.priceVerified} className="mt-0.5 accent-plum" /><span>{t("السعر مؤكَّد مع الشريك", "Price verified with partner")}<span className="block text-[11px] text-plum-500">{t("غير المؤكد يظهر للعملاء كـ \"قيد التأكيد\"", "Unverified prices show as \"pending\" to customers")}</span></span></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="isDemo" defaultChecked={initial.isDemo} className="mt-0.5 accent-plum" /><span>{t("منتج تجريبي", "Demo product")}<span className="block text-[11px] text-plum-500">{t("يظهر تنبيه للعملاء", "Shows a notice to customers")}</span></span></label>
          </div>
        </section>
        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("التصنيف", "Organisation")}</h2>
          <div className="grid gap-4">
            {L("SKU", "SKU", <input name="sku" defaultValue={initial.sku} required dir="ltr" className={cn(inp, "font-mono uppercase")} />)}
            {L("الموديل", "Model", <input name="model" defaultValue={initial.model} dir="ltr" className={inp} />)}
            {L("الفئة", "Category", <select name="categoryId" defaultValue={initial.categoryId} required className={inp}>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>)}
            {L("العلامة التجارية", "Brand", <select name="brandId" defaultValue={initial.brandId} className={inp}><option value="">—</option>{brands.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>)}
            {L("الشريك", "Partner", <select name="partnerId" defaultValue={initial.partnerId} required className={inp}>{partners.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>)}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={initial.featured} className="accent-plum" />{t("منتج مميز", "Featured")}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newArrival" defaultChecked={initial.newArrival} className="accent-plum" />{t("وصل حديثاً", "New arrival")}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="returnEligible" defaultChecked={initial.returnEligible} className="accent-plum" />{t("قابل للاسترجاع", "Return eligible")}</label>
          </div>
        </section>
        <section className="rounded-2xl border border-ivory-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold">{t("عمولة خاصة بالمنتج", "Product-specific commission")}</h2>
          <p className="mb-4 text-[11px] text-plum-500">{t("اتركيها فارغة لاستخدام اتفاقية الشريك.", "Leave empty to use the partner agreement.")}</p>
          <div className="grid grid-cols-2 gap-2">
            <select name="commissionType" defaultValue={initial.commissionType} className={inp} aria-label={t("نوع العمولة", "Commission type")}><option value="">—</option><option value="PERCENT">%</option><option value="FIXED">₪ / {t("قطعة", "unit")}</option></select>
            <input name="commissionValue" defaultValue={initial.commissionValue} inputMode="decimal" dir="ltr" className={inp} aria-label={t("القيمة", "Value")} />
          </div>
        </section>
      </aside>
    </ActionForm>
  );
}
