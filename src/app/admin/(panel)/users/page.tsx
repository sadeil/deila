import { saveRolePermissions, saveStaff } from "@/app/admin/actions/system";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { PERMISSIONS } from "@/lib/rbac";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge, Check, Field, PageHeader, Panel, Select, Table } from "@/components/admin/ui";

export const metadata = { title: "Staff & roles" };

export default async function UsersPage() {
  const me = await requireAdminPage("staff.manage");
  const t = await getT();
  const l = t.locale;
  const [users, roles, partners] = await Promise.all([
    db.adminUser.findMany({ include: { role: true, partner: true }, orderBy: { createdAt: "asc" } }),
    db.adminRole.findMany({ orderBy: { createdAt: "asc" } }),
    db.partner.findMany({ select: { id: true, name: true } }),
  ]);
  const roleOpts = roles.map((r) => ({ value: r.id, label: l === "ar" ? r.nameAr : r.nameEn }));
  const partnerOpts = [{ value: "", label: "—" }, ...partners.map((p) => ({ value: p.id, label: p.name }))];
  type U = (typeof users)[number];
  const StaffForm = ({ u }: { u?: U }) => (
    <ActionForm action={saveStaff} className="grid gap-3 sm:grid-cols-3" resetOnSuccess={!u}>
      {u && <input type="hidden" name="id" value={u.id} />}
      <Field label={t("الاسم", "Name")} name="name" defaultValue={u?.name} required />
      <Field label={t("البريد", "Email")} name="email" type="email" defaultValue={u?.email} required ltr />
      <Field label={u ? t("كلمة مرور جديدة (اختياري)", "New password (optional)") : t("كلمة المرور (12+)", "Password (12+)")} name="password" type="password" ltr autoComplete="new-password" minLength={12} />
      <Select label={t("الدور", "Role")} name="roleId" defaultValue={u?.roleId ?? roles.find((r) => r.key === "ORDER_MANAGER")?.id} options={roleOpts} />
      <Select label={t("الشريك (لدور شريك التنفيذ)", "Partner (for Fulfillment Partner)")} name="partnerId" defaultValue={u?.partnerId ?? ""} options={partnerOpts} />
      <div className="pt-6"><Check label={t("فعّال", "Active")} name="active" defaultChecked={u?.active ?? true} /></div>
      <div><button className="btn-primary btn-sm h-9">{u ? t("حفظ", "Save") : t("إضافة موظف", "Add staff")}</button></div>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title={t("الموظفون والصلاحيات", "Staff & roles")} description={t("لا يمكن إنشاء حسابات إدارية إلا من هنا بواسطة المدير العام. تغيير الدور أو كلمة المرور يُنهي جلسات المستخدم.", "Admin accounts can only be created here by a Super Admin. Changing role or password signs the user out everywhere.")} />
      <Panel pad={false} title={t("الموظفون", "Staff")}>
        <Table>
          <thead><tr><th>{t("الاسم", "Name")}</th><th>{t("الدور", "Role")}</th><th>{t("الحالة", "Status")}</th><th>{t("آخر دخول", "Last login")}</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td>{u.name}{u.id === me.id && <Badge className="ms-2">{t("أنت", "You")}</Badge>}<span className="block text-xs text-plum-500" dir="ltr">{u.email}</span></td>
                <td className="text-xs">{l === "ar" ? u.role.nameAr : u.role.nameEn}{u.partner && <span className="block text-plum-500">{u.partner.name}</span>}</td>
                <td><Badge tone={u.active ? "success" : "neutral"}>{u.active ? t("فعّال", "Active") : t("معطّل", "Disabled")}</Badge></td>
                <td className="text-xs text-plum-500">{u.lastLoginAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—"}</td>
                <td><details><summary className="cursor-pointer text-xs underline">{t("تعديل", "Edit")}</summary><div className="mt-3 min-w-[600px]"><StaffForm u={u} /></div></details></td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="border-t border-ivory-200 p-5"><p className="mb-3 text-sm font-semibold">{t("موظف جديد", "New staff member")}</p><StaffForm /></div>
      </Panel>

      <h2 className="mb-3 mt-10 text-sm font-semibold">{t("صلاحيات الأدوار", "Role permissions")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((r) => {
          const perms = Array.isArray(r.permissions) ? (r.permissions as string[]) : [];
          return (
            <Panel key={r.id} title={l === "ar" ? r.nameAr : r.nameEn} actions={r.key === "SUPER_ADMIN" ? <Badge tone="plum">{t("كل الصلاحيات", "All permissions")}</Badge> : undefined}>
              {r.key === "SUPER_ADMIN" ? <p className="text-xs text-plum-500">{t("دور المدير العام ثابت ولا يمكن تقييده.", "The Super Admin role is fixed and cannot be restricted.")}</p> : (
                <ActionForm action={saveRolePermissions}>
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {PERMISSIONS.map((p) => <label key={p} className="flex items-center gap-2 font-mono"><input type="checkbox" name="perm" value={p} defaultChecked={perms.includes(p)} className="accent-plum" />{p}</label>)}
                  </div>
                  <button className="btn-secondary btn-sm mt-4 h-8">{t("حفظ الصلاحيات", "Save permissions")}</button>
                </ActionForm>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
