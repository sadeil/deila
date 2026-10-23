import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { Badge, Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminPage("customers.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const where: Prisma.CustomerWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q.toLowerCase() } }, { phone: { contains: sp.q } }] } : {}),
    ...(sp.status ? { status: sp.status as "ACTIVE" } : {}),
  };
  const customers = await db.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { orders: { select: { total: true, status: true } } } });
  const guests = await db.order.groupBy({ by: ["phone", "fullName"], where: { customerId: null }, _count: true, _sum: { total: true }, orderBy: { _count: { phone: "desc" } }, take: 50 });

  return (
    <>
      <PageHeader title={t("العملاء", "Customers")} actions={<a href="/api/admin/export/customers" className="btn-secondary btn-sm h-10"><Icon name="download" className="h-4 w-4" />CSV</a>} />
      <Panel pad={false} title={t("حسابات مسجّلة", "Registered accounts")}>
        <form className="flex flex-wrap gap-2 border-b border-ivory-200 p-4">
          <input name="q" defaultValue={sp.q} placeholder={t("الاسم، البريد، الهاتف", "Name, email, phone")} className="field h-10 max-w-xs text-sm" />
          <select name="status" defaultValue={sp.status ?? ""} className="field h-10 max-w-[200px] text-sm" aria-label={t("الحالة", "Status")}>
            <option value="">{t("كل الحالات", "All statuses")}</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETION_REQUESTED">Deletion requested</option>
          </select>
          <button className="btn-primary btn-sm h-10">{t("بحث", "Search")}</button>
        </form>
        {customers.length === 0 ? <Empty icon="users" title={t("لا توجد حسابات", "No accounts")} /> : (
          <Table>
            <thead><tr><th>{t("الاسم", "Name")}</th><th>{t("التواصل", "Contact")}</th><th>{t("الطلبات", "Orders")}</th><th>{t("الإنفاق", "Spend")}</th><th>{t("الحالة", "Status")}</th><th>{t("التسجيل", "Joined")}</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link></td>
                  <td className="text-xs" dir="ltr">{c.email}<span className="block">{c.phone}</span></td>
                  <td className="tabular-nums">{c.orders.length}</td>
                  <td className="tabular-nums">{formatMoney(c.orders.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.total, 0), t.locale)}</td>
                  <td><Badge tone={c.status === "ACTIVE" ? "success" : c.status === "DELETION_REQUESTED" ? "warning" : "danger"}>{c.status}</Badge></td>
                  <td className="text-xs text-plum-500">{c.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Panel pad={false} className="mt-6" title={t("عملاء ضيوف (حسب الجوال)", "Guest customers (by phone)")}>
        {guests.length === 0 ? <Empty icon="users" title={t("لا يوجد", "None")} /> : (
          <Table>
            <thead><tr><th>{t("الاسم", "Name")}</th><th>{t("الجوال", "Phone")}</th><th>{t("الطلبات", "Orders")}</th><th>{t("القيمة", "Value")}</th></tr></thead>
            <tbody>{guests.map((g) => <tr key={g.phone + g.fullName}><td>{g.fullName}</td><td dir="ltr" className="text-xs"><Link href={`/admin/orders?q=${g.phone}`} className="hover:underline">{g.phone}</Link></td><td className="tabular-nums">{g._count}</td><td className="tabular-nums">{formatMoney(g._sum.total ?? 0, t.locale)}</td></tr>)}</tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
