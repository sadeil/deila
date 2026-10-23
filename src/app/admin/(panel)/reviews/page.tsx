import { moderateReview } from "@/app/admin/actions/catalog";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Empty, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireAdminPage("products.manage");
  const t = await getT();
  const reviews = await db.review.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { customer: true, product: true }, take: 200 });
  return (
    <>
      <PageHeader title={t("المراجعات", "Reviews")} description={t("فقط من عميلات استلمن المنتج. لا يُنشر شيء دون موافقة.", "Only from customers who received the product. Nothing is published without approval.")} />
      <Panel pad={false}>
        {reviews.length === 0 ? <Empty icon="star" title={t("لا توجد مراجعات بعد", "No reviews yet")} /> : (
          <ul className="divide-y divide-ivory-200">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold">{t.locale === "ar" ? r.product.nameAr : r.product.nameEn} · <span className="text-gold-700">{"★".repeat(r.rating)}</span></p>
                  <p className="mt-1 text-sm">{r.body}</p>
                  <p className="mt-1 text-xs text-plum-500">{r.customer.name} · {r.createdAt.toISOString().slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</Badge>
                  <ActionForm action={moderateReview} className="flex gap-1">
                    <input type="hidden" name="id" value={r.id} />
                    {r.status !== "APPROVED" && <button name="status" value="APPROVED" className="btn-primary btn-sm h-8">{t("نشر", "Approve")}</button>}
                    {r.status !== "REJECTED" && <button name="status" value="REJECTED" className="btn-secondary btn-sm h-8">{t("رفض", "Reject")}</button>}
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
