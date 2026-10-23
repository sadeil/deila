import { addSection, deleteSection, moveSection, savePage } from "@/app/admin/actions/system";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { asRecord } from "@/lib/utils";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Badge, Check, Field, PageHeader, Panel, TextArea } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Site content" };

const TYPE_LABEL: Record<string, [string, string]> = {
  HERO: ["الواجهة الرئيسية", "Hero"], CATEGORIES: ["تسوق حسب الفئة", "Shop by category"], COLLECTIONS: ["مجموعات مختارة", "Curated collections"],
  FEATURED: ["منتجات مميزة", "Featured products"], BEST_SELLERS: ["الأكثر مبيعاً", "Best sellers"], NEW_ARRIVALS: ["وصل حديثاً", "New arrivals"],
  SPOTLIGHT: ["تحت الضوء", "Spotlight"], LIFESTYLE: ["أسلوب حياة", "Lifestyle"], STORY: ["قصة المنتج/العلامة", "Story"], OFFERS: ["العروض", "Offers"],
  WHY: ["لماذا ديلا", "Why DELLA"], REVIEWS: ["آراء العملاء", "Reviews"], NEWSLETTER: ["النشرة البريدية", "Newsletter"], SOCIAL: ["التواصل الاجتماعي", "Social"],
};

export default async function ContentPage() {
  await requireAdminPage("content.manage");
  const t = await getT();
  const l = t.locale;
  const [sections, products, categories, pages, s] = await Promise.all([
    db.homepageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, nameAr: true, nameEn: true } }),
    db.category.findMany({ where: { archived: false }, select: { slug: true, nameAr: true, nameEn: true } }),
    db.contentPage.findMany({ orderBy: { slug: "asc" } }),
    getSettings(),
  ]);
  const save = t("حفظ", "Save");

  return (
    <>
      <PageHeader title={t("محتوى الموقع", "Site content")} description={t("كل ما يظهر في الصفحة الرئيسية والتذييل والصفحات — بدون تعديل الكود.", "Everything on the homepage, footer and pages — no code changes needed.")}
        actions={<a href="/" target="_blank" className="btn-secondary btn-sm h-10"><Icon name="external" className="h-4 w-4" />{t("معاينة", "Preview")}</a>} />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t("أقسام الصفحة الرئيسية (بالترتيب)", "Homepage sections (in order)")}</h2>
          {sections.map((sec, i) => (
            <Panel key={sec.id} title={<span className="flex items-center gap-2"><span className="text-plum-400 tabular-nums">{i + 1}.</span>{l === "ar" ? TYPE_LABEL[sec.type]?.[0] : TYPE_LABEL[sec.type]?.[1]}{!sec.visible && <Badge>{t("مخفي", "Hidden")}</Badge>}</span>}
              actions={<div className="flex items-center gap-1">
                <ActionForm action={moveSection}><input type="hidden" name="id" value={sec.id} /><button name="dir" value="up" disabled={i === 0} className="grid h-7 w-7 place-items-center rounded-full hover:bg-ivory-100 disabled:opacity-30" aria-label={t("لأعلى", "Move up")}><Icon name="chevronDown" className="h-4 w-4 rotate-180" /></button></ActionForm>
                <ActionForm action={moveSection}><input type="hidden" name="id" value={sec.id} /><button name="dir" value="down" disabled={i === sections.length - 1} className="grid h-7 w-7 place-items-center rounded-full hover:bg-ivory-100 disabled:opacity-30" aria-label={t("لأسفل", "Move down")}><Icon name="chevronDown" className="h-4 w-4" /></button></ActionForm>
                <ActionForm action={deleteSection}><input type="hidden" name="id" value={sec.id} /><ConfirmButton message={t("حذف القسم؟", "Delete this section?")} className="grid h-7 w-7 place-items-center rounded-full text-danger hover:bg-rose-50"><Icon name="trash" className="h-3.5 w-3.5" /></ConfirmButton></ActionForm>
              </div>}>
              <details><summary className="cursor-pointer text-sm text-plum-600">{t("تعديل المحتوى", "Edit content")}</summary>
                <div className="mt-4"><SectionEditor section={{ ...sec, config: asRecord(sec.config) }}
                  products={products.map((p) => ({ slug: p.slug, label: l === "ar" ? p.nameAr : p.nameEn }))}
                  categories={categories.map((c) => ({ slug: c.slug, label: l === "ar" ? c.nameAr : c.nameEn }))} /></div>
              </details>
            </Panel>
          ))}
          <ActionForm action={addSection} className="flex gap-2">
            <select name="type" className="field h-10 max-w-xs text-sm" aria-label={t("نوع القسم", "Section type")}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{l === "ar" ? v[0] : v[1]}</option>)}</select>
            <button className="btn-secondary btn-sm h-10"><Icon name="plus" className="h-4 w-4" />{t("إضافة قسم", "Add section")}</button>
          </ActionForm>
        </div>

        <div className="space-y-6">
          <Panel title={t("شريط الإعلانات", "Announcement bar")}>
            <SettingsForm k="announcement" label={save}>
              <Field label={t("النص (ع)", "Text (AR)")} name="textAr" defaultValue={s.announcement.textAr} className="sm:col-span-2" />
              <Field label={t("النص (EN)", "Text (EN)")} name="textEn" defaultValue={s.announcement.textEn} ltr className="sm:col-span-2" />
              <Field label={t("الرابط", "Link")} name="link" defaultValue={s.announcement.link} ltr />
              <div className="pt-6"><Check label={t("ظاهر", "Visible")} name="enabled" defaultChecked={s.announcement.enabled} /></div>
            </SettingsForm>
          </Panel>
          <Panel title={t("التذييل", "Footer")}>
            <SettingsForm k="footer" label={save}>
              <TextArea label={t("نبذة (ع)", "About (AR)")} name="aboutAr" defaultValue={s.footer.aboutAr} className="sm:col-span-2" />
              <TextArea label={t("نبذة (EN)", "About (EN)")} name="aboutEn" defaultValue={s.footer.aboutEn} className="sm:col-span-2" dir="ltr" />
            </SettingsForm>
          </Panel>
          <Panel title={t("روابط التواصل الاجتماعي", "Social links")}>
            <SettingsForm k="social" label={save}>
              <Field label="Instagram" name="instagram" defaultValue={s.social.instagram} ltr placeholder="https://instagram.com/…" />
              <Field label="Facebook" name="facebook" defaultValue={s.social.facebook} ltr />
              <Field label="TikTok" name="tiktok" defaultValue={s.social.tiktok} ltr />
              <Field label={t("رابط واتساب", "WhatsApp link")} name="whatsapp" defaultValue={s.social.whatsapp} ltr placeholder="https://wa.me/970…" />
            </SettingsForm>
          </Panel>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold">{t("صفحات المحتوى والسياسات", "Content & policy pages")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {pages.map((p) => (
          <Panel key={p.slug} title={<span className="flex items-center gap-2"><span className="font-mono text-xs">/pages/{p.slug}</span> {l === "ar" ? p.titleAr : p.titleEn}{!p.published && <Badge>{t("غير منشورة", "Unpublished")}</Badge>}</span>}>
            <details><summary className="cursor-pointer text-sm text-plum-600">{t("تعديل", "Edit")}</summary>
              <ActionForm action={savePage} className="mt-4 grid gap-3">
                <input type="hidden" name="slug" value={p.slug} />
                <Field label={t("العنوان (ع)", "Title (AR)")} name="titleAr" defaultValue={p.titleAr} required />
                <Field label={t("العنوان (EN)", "Title (EN)")} name="titleEn" defaultValue={p.titleEn} required ltr />
                <TextArea label={t("النص (ع)", "Body (AR)")} name="bodyAr" defaultValue={p.bodyAr} rows={8} />
                <TextArea label={t("النص (EN)", "Body (EN)")} name="bodyEn" defaultValue={p.bodyEn} rows={8} dir="ltr" />
                <Check label={t("منشورة", "Published")} name="published" defaultChecked={p.published} />
                <button className="btn-primary btn-sm h-9 w-fit">{save}</button>
              </ActionForm>
            </details>
          </Panel>
        ))}
      </div>
    </>
  );
}
