import Link from "next/link";
import { closeInquiry, markNotificationsRead } from "@/app/admin/actions/system";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Empty, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireAdminPage("notifications.view");
  const t = await getT();
  const fmt = new Intl.DateTimeFormat(t.locale === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "short", timeStyle: "short" });
  const [inApp, outbound, inquiries] = await Promise.all([
    db.notification.findMany({ where: { channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 60 }),
    db.notification.findMany({ where: { channel: { not: "IN_APP" } }, orderBy: { createdAt: "desc" }, take: 60 }),
    db.inquiry.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 50 }),
  ]);
  const markAll = async () => { "use server"; await markNotificationsRead(); };

  return (
    <>
      <PageHeader title={t("الإشعارات", "Notifications")} actions={<form action={markAll}><button className="btn-secondary btn-sm h-10">{t("تعليم الكل كمقروء", "Mark all read")}</button></form>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t("إشعارات الإدارة", "Admin notifications")} pad={false}>
          {inApp.length === 0 ? <Empty icon="bell" title={t("لا إشعارات", "No notifications")} /> : (
            <ul className="divide-y divide-ivory-200">
              {inApp.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.status === "UNREAD" ? "bg-danger" : "bg-ivory-300"}`} />
                  <span className="flex-1"><span className="font-medium">{n.title}</span><span className="block text-xs text-plum-500">{n.body}</span></span>
                  <span className="text-[11px] text-plum-500">{fmt.format(n.createdAt)}</span>
                  {n.orderId && <Link href={`/admin/orders/${n.orderId}`} className="text-xs underline">{t("فتح", "Open")}</Link>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title={t("رسائل العملاء (من نموذج التواصل)", "Customer inquiries")} pad={false}>
            {inquiries.length === 0 ? <Empty icon="chat" title={t("لا رسائل", "No inquiries")} /> : (
              <ul className="divide-y divide-ivory-200">
                {inquiries.map((q) => (
                  <li key={q.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{q.name} <span className="text-xs font-normal text-plum-500" dir="ltr">{q.phone ?? ""} {q.email ?? ""}</span></span>
                      {q.status === "OPEN" ? <ActionForm action={closeInquiry}><input type="hidden" name="id" value={q.id} /><button className="text-xs underline">{t("إغلاق", "Close")}</button></ActionForm> : <Badge>{t("مغلقة", "Closed")}</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-plum-700">{q.message}</p>
                    <p className="mt-1 text-[11px] text-plum-500">{fmt.format(q.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t("الرسائل الصادرة للعملاء", "Outbound customer messages")} pad={false}>
            {outbound.length === 0 ? <Empty icon="mail" title={t("لا يوجد", "None")} /> : (
              <ul className="divide-y divide-ivory-200">
                {outbound.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
                    <Badge tone={n.status === "SENT" ? "success" : n.status === "FAILED" ? "danger" : "warning"}>{n.status === "NOT_CONFIGURED" ? t("لم تُرسل — القناة غير مُعدّة", "Not sent — channel not configured") : n.status}</Badge>
                    <span className="font-mono">{n.channel}</span>
                    <span className="flex-1 truncate">{n.title}</span>
                    <span className="text-plum-500">{fmt.format(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
