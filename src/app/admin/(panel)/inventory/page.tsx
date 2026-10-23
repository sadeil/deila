import Link from "next/link";
import { updateInventory } from "@/app/admin/actions/catalog";
import { can, requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { availabilityLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Notice, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const admin = await requireAdminPage("inventory.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const l = t.locale;
  const rows = await db.inventory.findMany({
    where: {
      variant: { product: { status: { not: "ARCHIVED" }, ...(admin.partnerId ? { partnerId: admin.partnerId } : {}) } },
      ...(sp.filter === "unverified" ? { verified: false } : sp.filter === "out" ? { availability: "OUT_OF_STOCK" } : {}),
    },
    include: { variant: { include: { product: { select: { id: true, nameAr: true, nameEn: true } } } }, adjustments: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
  });
  const filtered = sp.filter === "low" ? rows.filter((r) => r.trackQuantity && r.quantity <= r.lowStockThreshold) : rows;
  const manage = can(admin, "inventory.manage");
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "short", timeStyle: "short" });
  const unverified = rows.filter((r) => !r.verified).length;

  return (
    <>
      <PageHeader title={t("المخزون", "Inventory")} description={t("تتبع الكميات والتوفر لكل خيار منتج.", "Track quantity and availability per product variant.")}
        actions={<a href="/api/admin/export/inventory" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a>} />
      {unverified > 0 && <div className="mb-4"><Notice>{t(`${unverified} عنصر بتوفر غير مؤكد. يُعرض للعملاء كـ "يُؤكَّد بعد الطلب" حتى تتحققي مع الشريك.`, `${unverified} items have unverified availability. Customers see "confirmed after ordering" until you verify with the partner.`)}</Notice></div>}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {[[undefined, t("الكل", "All")], ["low", t("مخزون منخفض", "Low stock")], ["out", t("نفد", "Out of stock")], ["unverified", t("غير مؤكد", "Unverified")]].map(([f, label]) => (
          <Link key={label} href={f ? `?filter=${f}` : "?"} className={cn("chip", sp.filter === f && "border-plum bg-plum text-ivory")}>{label}</Link>
        ))}
      </div>
      <Panel pad={false}>
        <Table>
          <thead><tr><th>{t("المنتج / الخيار", "Product / variant")}</th><th>{t("التوفر", "Availability")}</th><th>{t("الكمية", "Quantity")}</th><th>{t("آخر الحركات", "Recent movements")}</th>{manage && <th>{t("تحديث", "Update")}</th>}</tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="align-top">
                <td>
                  <Link href={`/admin/products/${r.variant.product.id}`} className="font-medium hover:underline">{l === "ar" ? r.variant.product.nameAr : r.variant.product.nameEn}</Link>
                  <span className="block text-xs text-plum-500">{l === "ar" ? r.variant.nameAr : r.variant.nameEn} · <span className="font-mono" dir="ltr">{r.variant.sku}</span></span>
                  {r.partnerRef && <span className="block text-[11px] text-plum-400">{t("مرجع الشريك:", "Partner ref:")} {r.partnerRef}</span>}
                </td>
                <td>
                  <Badge tone={r.availability === "IN_STOCK" ? "success" : r.availability === "OUT_OF_STOCK" ? "danger" : "warning"}>{availabilityLabel(l, r.availability)}</Badge>
                  <span className={cn("mt-1 block text-[11px]", r.verified ? "text-success" : "text-gold-700")}>{r.verified ? t("✓ مؤكد مع الشريك", "✓ Verified with partner") : t("غير مؤكد", "Not verified")}</span>
                </td>
                <td className="tabular-nums">{r.trackQuantity ? <span className={cn("font-semibold", r.quantity <= r.lowStockThreshold && "text-danger")}>{r.quantity}</span> : <span className="text-xs text-plum-500">{t("غير متتبع", "Untracked")}</span>}</td>
                <td className="text-[11px] text-plum-500">
                  {r.adjustments.length ? r.adjustments.map((a) => <div key={a.id}>{fmt.format(a.createdAt)} · <span className={a.delta < 0 ? "text-danger" : "text-success"}>{a.delta > 0 ? "+" : ""}{a.delta}</span> → {a.quantityAfter} · {a.reason}{a.note && ` (${a.note})`}</div>) : "—"}
                </td>
                {manage && (
                  <td>
                    <ActionForm action={updateInventory} className="grid min-w-[300px] grid-cols-2 gap-2 text-xs">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="availability" defaultValue={r.availability} className="field h-8 px-2 text-xs" aria-label={t("التوفر", "Availability")}>
                        {["IN_STOCK", "OUT_OF_STOCK", "PREORDER", "UNVERIFIED"].map((a) => <option key={a} value={a}>{availabilityLabel(l, a)}</option>)}
                      </select>
                      <input name="quantity" type="number" min={0} defaultValue={r.quantity} className="field h-8 px-2 text-xs" aria-label={t("الكمية", "Quantity")} />
                      <input name="lowStockThreshold" type="number" min={0} defaultValue={r.lowStockThreshold} className="field h-8 px-2 text-xs" aria-label={t("حد التنبيه", "Alert threshold")} title={t("حد التنبيه", "Alert threshold")} />
                      <input name="partnerRef" defaultValue={r.partnerRef ?? ""} placeholder={t("مرجع الشريك", "Partner ref")} className="field h-8 px-2 text-xs" />
                      <input name="note" placeholder={t("سبب التعديل", "Reason for change")} className="field col-span-2 h-8 px-2 text-xs" />
                      <label className="flex items-center gap-1"><input type="checkbox" name="trackQuantity" defaultChecked={r.trackQuantity} className="accent-plum" />{t("تتبع الكمية", "Track qty")}</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="verified" defaultChecked={r.verified} className="accent-plum" />{t("مؤكد", "Verified")}</label>
                      <button className="btn-primary btn-sm col-span-2 h-8">{t("حفظ", "Save")}</button>
                    </ActionForm>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <p className="mt-3 text-xs text-plum-500">{t("عند تفعيل تتبع الكمية يُمنع البيع الزائد: الطلب يحجز الكمية ضمن معاملة، والإلغاء يعيدها تلقائياً.", "With quantity tracking on, overselling is prevented: orders reserve stock in a transaction and cancellations restock automatically.")}</p>
    </>
  );
}
