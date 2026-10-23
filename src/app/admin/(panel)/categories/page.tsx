import Image from "next/image";
import { archiveCategory, deleteBrand, saveBrand, saveCategory } from "@/app/admin/actions/catalog";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { SingleImage } from "@/components/admin/ImageUploader";
import { Badge, Check, Field, PageHeader, Panel, TextArea } from "@/components/admin/ui";

export const metadata = { title: "Categories & brands" };

export default async function CategoriesPage() {
  await requireAdminPage("catalog.manage");
  const t = await getT();
  const l = t.locale;
  const [cats, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ archived: "asc" }, { sortOrder: "asc" }], include: { _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);

  const CatForm = ({ c }: { c?: (typeof cats)[number] }) => (
    <ActionForm action={saveCategory} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label={t("الاسم بالعربية", "Name (Arabic)")} name="nameAr" defaultValue={c?.nameAr} required />
      <Field label={t("الاسم بالإنجليزية", "Name (English)")} name="nameEn" defaultValue={c?.nameEn} required ltr />
      <TextArea label={t("الوصف بالعربية", "Description (AR)")} name="descAr" defaultValue={c?.descAr} rows={2} />
      <TextArea label={t("الوصف بالإنجليزية", "Description (EN)")} name="descEn" defaultValue={c?.descEn} rows={2} dir="ltr" />
      <Field label={t("الرابط", "Slug")} name="slug" defaultValue={c?.slug} ltr />
      <Field label={t("ترتيب العرض", "Display order")} name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
      <Field label={t("عنوان SEO", "SEO title")} name="seoTitle" defaultValue={c?.seoTitle} />
      <Field label={t("وصف SEO", "SEO description")} name="seoDesc" defaultValue={c?.seoDesc} />
      <div className="sm:col-span-2"><span className="label">{t("صورة الفئة", "Category image")}</span><SingleImage name="image" defaultValue={c?.image} /></div>
      <Check label={t("ظاهرة في المتجر", "Visible in store")} name="visible" defaultChecked={c?.visible ?? true} />
      <div className="sm:col-span-2"><button className="btn-primary btn-sm h-9">{c ? t("حفظ", "Save") : t("إضافة فئة", "Add category")}</button></div>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title={t("الفئات والعلامات التجارية", "Categories & brands")} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {cats.map((c) => (
            <Panel key={c.id} title={<span className="flex items-center gap-3">
              <span className="relative h-9 w-8 overflow-hidden rounded bg-ivory-100">{c.image && <Image src={c.image} alt="" fill sizes="32px" className="object-cover" />}</span>
              {l === "ar" ? c.nameAr : c.nameEn}
              <span className="text-xs font-normal text-plum-500">{c._count.products} {t("منتج", "products")}</span>
              {!c.visible && <Badge>{t("مخفية", "Hidden")}</Badge>}{c.archived && <Badge tone="danger">{t("مؤرشفة", "Archived")}</Badge>}
            </span>}
              actions={<ActionForm action={archiveCategory}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="archived" value={c.archived ? "0" : "1"} /><button className="text-xs underline">{c.archived ? t("استعادة", "Restore") : t("أرشفة", "Archive")}</button></ActionForm>}>
              <details><summary className="cursor-pointer text-sm text-plum-600">{t("تعديل", "Edit")}</summary><div className="mt-4"><CatForm c={c} /></div></details>
            </Panel>
          ))}
          <Panel title={t("فئة جديدة", "New category")}><CatForm /></Panel>
        </div>
        <Panel title={t("العلامات التجارية", "Brands")}>
          <ul className="mb-6 divide-y divide-ivory-200">
            {brands.map((b) => (
              <li key={b.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between text-sm">
                    <span>{l === "ar" ? b.nameAr : b.nameEn} <span className="text-xs text-plum-500">· {b._count.products}</span> {!b.visible && <Badge>{t("مخفية", "Hidden")}</Badge>}</span>
                  </summary>
                  <ActionForm action={saveBrand} className="mt-3 grid gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <Field label={t("بالعربية", "Arabic")} name="nameAr" defaultValue={b.nameAr} required />
                    <Field label={t("بالإنجليزية", "English")} name="nameEn" defaultValue={b.nameEn} required ltr />
                    <Field label={t("الترتيب", "Order")} name="sortOrder" type="number" defaultValue={b.sortOrder} />
                    <SingleImage name="logo" defaultValue={b.logo} />
                    <Check label={t("ظاهرة", "Visible")} name="visible" defaultChecked={b.visible} />
                    <button className="btn-primary btn-sm h-8 w-fit">{t("حفظ", "Save")}</button>
                  </ActionForm>
                  <ActionForm action={deleteBrand} className="mt-2"><input type="hidden" name="id" value={b.id} /><ConfirmButton message={t("حذف العلامة؟", "Delete brand?")} className="text-xs text-danger underline">{t("حذف", "Delete")}</ConfirmButton></ActionForm>
                </details>
              </li>
            ))}
            {!brands.length && <li className="py-3 text-sm text-plum-500">{t("لا توجد علامات بعد.", "No brands yet.")}</li>}
          </ul>
          <ActionForm action={saveBrand} className="grid gap-2" resetOnSuccess>
            <p className="text-sm font-semibold">{t("علامة جديدة", "New brand")}</p>
            <Field label={t("بالعربية", "Arabic")} name="nameAr" required />
            <Field label={t("بالإنجليزية", "English")} name="nameEn" required ltr />
            <input type="hidden" name="visible" value="on" />
            <button className="btn-primary btn-sm h-9 w-fit">{t("إضافة", "Add")}</button>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
