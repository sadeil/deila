import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct, duplicateProduct } from "@/app/admin/actions/products";
import { requireAdminPage, can } from "@/lib/auth";
import { editorOptions, productInput } from "@/lib/admin-product";
import { getT } from "@/lib/i18n";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { Notice, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const admin = await requireAdminPage("products.view");
  const [{ id }, sp, t] = await Promise.all([params, searchParams, getT()]);
  const [initial, opts] = await Promise.all([productInput(id), editorOptions(t.locale)]);
  if (!initial) notFound();
  const manage = can(admin, "products.manage");
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: t("المنتجات", "Products") }} title={t.locale === "ar" ? initial.nameAr : initial.nameEn}
        description={`SKU ${initial.sku}`}
        actions={<>
          <Link href={`/product/${initial.slug}`} target="_blank" className="btn-ghost btn-sm h-9"><Icon name="external" className="h-4 w-4" />{t("عرض", "View")}</Link>
          {manage && <ActionForm action={duplicateProduct}><input type="hidden" name="id" value={id} /><button className="btn-secondary btn-sm h-9"><Icon name="copy" className="h-4 w-4" />{t("نسخ", "Duplicate")}</button></ActionForm>}
          {manage && <ActionForm action={deleteProduct}><input type="hidden" name="id" value={id} /><ConfirmButton message={t("حذف المنتج نهائياً؟ (المنتجات المطلوبة سابقاً يجب أرشفتها)", "Delete permanently? (Products with orders must be archived instead)")} className="btn-ghost btn-sm h-9 text-danger"><Icon name="trash" className="h-4 w-4" />{t("حذف", "Delete")}</ConfirmButton></ActionForm>}
        </>} />
      {sp.created && <div className="mb-6"><Notice tone="success" icon="check">{t("تم إنشاء المنتج. أضيفي المخزون من صفحة المخزون.", "Product created. Set its stock in Inventory.")}</Notice></div>}
      {manage ? <ProductEditor initial={initial} {...opts} /> : <Notice>{t("عرض فقط — لا تملك صلاحية التعديل.", "View only — you don't have edit permission.")}</Notice>}
    </>
  );
}
