import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { setProductStatus } from "@/app/admin/actions/products";
import { can, requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; demo?: string }> }) {
  const admin = await requireAdminPage("products.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const and: Prisma.ProductWhereInput[] = [];
  if (admin.partnerId) and.push({ partnerId: admin.partnerId });
  if (sp.q) and.push({ OR: [{ nameAr: { contains: sp.q } }, { nameEn: { contains: sp.q } }, { sku: { contains: sp.q.toUpperCase() } }] });
  if (sp.status === "DRAFT" || sp.status === "PUBLISHED" || sp.status === "ARCHIVED") and.push({ status: sp.status });
  else and.push({ status: { not: "ARCHIVED" } });
  if (sp.category) and.push({ categoryId: sp.category });
  if (sp.demo) and.push({ isDemo: true });
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { AND: and }, orderBy: { updatedAt: "desc" },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: true, variants: { include: { inventory: true } }, _count: { select: { orderItems: true } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const manage = can(admin, "products.manage");
  const tab = (status: string | undefined, label: string) => (
    <Link href={status ? `?status=${status}` : "?"} className={cn("chip", sp.status === status && "border-plum bg-plum text-ivory")}>{label}</Link>
  );

  return (
    <>
      <PageHeader title={t("المنتجات", "Products")} description={t(`${products.length} منتج`, `${products.length} products`)}
        actions={<>
          <a href="/api/admin/export/products" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a>
          {manage && <Link href="/admin/products/new" className="btn-primary btn-sm h-10"><Icon name="plus" className="h-4 w-4" />{t("منتج جديد", "New product")}</Link>}
        </>} />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {tab(undefined, t("النشطة", "Active"))}{tab("PUBLISHED", t("منشور", "Published"))}{tab("DRAFT", t("مسودة", "Draft"))}{tab("ARCHIVED", t("مؤرشف", "Archived"))}
        <Link href="?demo=1" className={cn("chip", sp.demo && "border-plum bg-plum text-ivory")}>{t("تجريبي", "Demo")}</Link>
      </div>
      <Panel pad={false}>
        <form className="flex flex-wrap gap-2 border-b border-ivory-200 p-4">
          <input name="q" defaultValue={sp.q} placeholder={t("بحث بالاسم أو SKU", "Search name or SKU")} className="field h-10 max-w-xs text-sm" />
          <select name="category" defaultValue={sp.category ?? ""} className="field h-10 max-w-[220px] text-sm" aria-label={t("الفئة", "Category")}>
            <option value="">{t("كل الفئات", "All categories")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{l === "ar" ? c.nameAr : c.nameEn}</option>)}
          </select>
          <button className="btn-primary btn-sm h-10">{t("بحث", "Search")}</button>
        </form>
        {products.length === 0 ? <Empty title={t("لا توجد منتجات", "No products")} /> : (
          <Table>
            <thead><tr><th>{t("المنتج", "Product")}</th><th>{t("الفئة", "Category")}</th><th>{t("السعر", "Price")}</th><th>{t("المخزون", "Stock")}</th><th>{t("الحالة", "Status")}</th><th>{t("مبيعات", "Sold")}</th><th /></tr></thead>
            <tbody>
              {products.map((p) => {
                const tracked = p.variants.filter((v) => v.inventory?.trackQuantity);
                const qty = tracked.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
                const unverified = p.variants.some((v) => !v.inventory?.verified);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-ivory-100">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</span>
                        <span><span className="font-medium hover:underline">{l === "ar" ? p.nameAr : p.nameEn}</span><span className="block font-mono text-[11px] text-plum-500" dir="ltr">{p.sku}</span></span>
                      </Link>
                    </td>
                    <td className="text-xs">{l === "ar" ? p.category.nameAr : p.category.nameEn}</td>
                    <td className="tabular-nums">{formatMoney(p.price, l)}{!p.priceVerified && <Badge tone="gold" className="ms-1">{t("غير مؤكد", "Unverified")}</Badge>}</td>
                    <td className="text-xs">{tracked.length ? <span className={cn("tabular-nums", qty <= 3 && "font-semibold text-danger")}>{qty}</span> : <span className="text-plum-500">{t("غير متتبع", "Untracked")}</span>}{unverified && <span className="block text-[11px] text-gold-700">{t("توفر غير مؤكد", "Unverified")}</span>}</td>
                    <td className="space-x-1 rtl:space-x-reverse">
                      <Badge tone={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "warning" : "neutral"}>{p.status === "PUBLISHED" ? t("منشور", "Published") : p.status === "DRAFT" ? t("مسودة", "Draft") : t("مؤرشف", "Archived")}</Badge>
                      {p.isDemo && <Badge tone="gold">{t("تجريبي", "Demo")}</Badge>}
                      {p.featured && <Badge tone="plum">★</Badge>}
                    </td>
                    <td className="tabular-nums text-xs">{p._count.orderItems}</td>
                    <td>
                      {manage && (
                        <ActionForm action={setProductStatus} className="flex justify-end">
                          <input type="hidden" name="id" value={p.id} />
                          {p.status === "PUBLISHED"
                            ? <button name="status" value="DRAFT" className="btn-ghost btn-sm h-8 text-xs">{t("إلغاء النشر", "Unpublish")}</button>
                            : <button name="status" value="PUBLISHED" className="btn-ghost btn-sm h-8 text-xs">{t("نشر", "Publish")}</button>}
                          {p.status !== "ARCHIVED" && <button name="status" value="ARCHIVED" className="btn-ghost btn-sm h-8 text-xs text-plum-500">{t("أرشفة", "Archive")}</button>}
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
