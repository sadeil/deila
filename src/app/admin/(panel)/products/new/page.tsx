import { requireAdminPage } from "@/lib/auth";
import { blankProduct, editorOptions } from "@/lib/admin-product";
import { getT } from "@/lib/i18n";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireAdminPage("products.manage");
  const t = await getT();
  const [initial, opts] = await Promise.all([blankProduct(), editorOptions(t.locale)]);
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: t("المنتجات", "Products") }} title={t("منتج جديد", "New product")} />
      <ProductEditor initial={initial} {...opts} />
    </>
  );
}
