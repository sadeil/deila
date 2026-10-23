import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/rbac";
import { AdminShell, type NavItem } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · DELLA Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", icon: "grid", ar: "نظرة عامة", en: "Overview", group: "ops", perm: "dashboard.view" },
  { href: "/admin/orders", icon: "package", ar: "الطلبات", en: "Orders", group: "ops", perm: "orders.view" },
  { href: "/admin/payments", icon: "card", ar: "المدفوعات", en: "Payments", group: "ops", perm: "payments.view" },
  { href: "/admin/delivery", icon: "truck", ar: "التوصيل", en: "Delivery", group: "ops", perm: "delivery.manage" },
  { href: "/admin/customers", icon: "users", ar: "العملاء", en: "Customers", group: "ops", perm: "customers.view" },
  { href: "/admin/products", icon: "sparkle", ar: "المنتجات", en: "Products", group: "catalog", perm: "products.view" },
  { href: "/admin/categories", icon: "layout", ar: "الفئات والعلامات", en: "Categories & brands", group: "catalog", perm: "catalog.manage" },
  { href: "/admin/inventory", icon: "package", ar: "المخزون", en: "Inventory", group: "catalog", perm: "inventory.view" },
  { href: "/admin/reviews", icon: "star", ar: "المراجعات", en: "Reviews", group: "catalog", perm: "products.manage" },
  { href: "/admin/commissions", icon: "coins", ar: "العمولات", en: "Commissions", group: "business", perm: "commissions.view" },
  { href: "/admin/partners", icon: "handshake", ar: "الشركاء", en: "Retail partners", group: "business", perm: "partners.manage" },
  { href: "/admin/coupons", icon: "tag", ar: "العروض والكوبونات", en: "Promotions", group: "business", perm: "promotions.manage" },
  { href: "/admin/reports", icon: "chart", ar: "التقارير", en: "Reports", group: "business", perm: "reports.view" },
  { href: "/admin/content", icon: "doc", ar: "محتوى الموقع", en: "Site content", group: "system", perm: "content.manage" },
  { href: "/admin/notifications", icon: "bell", ar: "الإشعارات", en: "Notifications", group: "system", perm: "notifications.view" },
  { href: "/admin/users", icon: "shield", ar: "الموظفون والصلاحيات", en: "Staff & roles", group: "system", perm: "staff.manage" },
  { href: "/admin/settings", icon: "settings", ar: "الإعدادات", en: "Settings", group: "system", perm: "settings.manage" },
  { href: "/admin/audit", icon: "eye", ar: "سجل التدقيق", en: "Audit log", group: "system", perm: "audit.view" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const [unread, pending] = await Promise.all([
    db.notification.count({ where: { channel: "IN_APP", status: "UNREAD" } }),
    db.order.count({ where: { status: "PENDING_CONFIRMATION", ...(admin.partnerId ? { partnerId: admin.partnerId } : {}) } }),
  ]);
  const nav = NAV.filter((n) => hasPermission(admin.permissions, n.perm)).map(({ perm: _p, ...n }) => (n.href === "/admin/orders" ? { ...n, badge: pending } : n));
  return (
    <AdminShell nav={nav} unread={hasPermission(admin.permissions, "notifications.view") ? unread : 0} user={{ name: admin.name, roleAr: admin.role.nameAr, roleEn: admin.role.nameEn }}>
      {children}
    </AdminShell>
  );
}
