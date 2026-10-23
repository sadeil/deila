import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { PageHeader, Panel, Table } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage("audit.view");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const logs = await db.auditLog.findMany({
    where: sp.q ? { OR: [{ action: { contains: sp.q } }, { entity: { contains: sp.q } }, { actorName: { contains: sp.q } }, { entityId: { contains: sp.q } }] } : {},
    orderBy: { createdAt: "desc" }, take: 300,
  });
  return (
    <>
      <PageHeader title={t("سجل التدقيق", "Audit log")} description={t("سجل غير قابل للتعديل لكل إجراء إداري وحدث دفع.", "Append-only record of every admin action and payment event.")} />
      <Panel pad={false}>
        <form className="border-b border-ivory-200 p-4"><input name="q" defaultValue={sp.q} placeholder={t("بحث بالإجراء أو الكيان أو الموظف", "Search action, entity or staff")} className="field h-10 max-w-sm text-sm" /></form>
        <Table>
          <thead><tr><th>{t("الوقت", "Time")}</th><th>{t("المنفّذ", "Actor")}</th><th>{t("الإجراء", "Action")}</th><th>{t("الكيان", "Entity")}</th><th>{t("التفاصيل", "Details")}</th><th>IP</th></tr></thead>
          <tbody>
            {logs.map((a) => (
              <tr key={a.id} className="align-top text-xs">
                <td className="whitespace-nowrap font-mono">{a.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td>{a.actorName ?? a.actorType}</td>
                <td className="font-mono">{a.action}</td>
                <td className="font-mono">{a.entity}{a.entityId && <span className="block text-plum-500">{a.entityId.slice(0, 12)}</span>}</td>
                <td className="max-w-xs truncate font-mono text-[11px] text-plum-500" title={a.data ? JSON.stringify(a.data) : ""}>{a.data ? JSON.stringify(a.data) : ""}</td>
                <td className="font-mono text-[11px]">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
