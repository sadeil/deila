export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.refund",
  "products.view",
  "products.manage",
  "catalog.manage",
  "inventory.view",
  "inventory.manage",
  "customers.view",
  "customers.manage",
  "commissions.view",
  "commissions.manage",
  "partners.manage",
  "delivery.manage",
  "promotions.manage",
  "payments.view",
  "content.manage",
  "reports.view",
  "notifications.view",
  "staff.manage",
  "settings.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const DEFAULT_ROLES: { key: string; nameAr: string; nameEn: string; permissions: Permission[] }[] = [
  { key: "SUPER_ADMIN", nameAr: "مدير عام", nameEn: "Super Admin", permissions: [...PERMISSIONS] },
  {
    key: "STORE_MANAGER", nameAr: "مدير المتجر", nameEn: "Store Manager",
    permissions: PERMISSIONS.filter((p) => p !== "staff.manage" && p !== "audit.view"),
  },
  {
    key: "PRODUCT_MANAGER", nameAr: "مدير المنتجات", nameEn: "Product Manager",
    permissions: ["dashboard.view", "products.view", "products.manage", "catalog.manage", "inventory.view", "inventory.manage", "content.manage"],
  },
  {
    key: "ORDER_MANAGER", nameAr: "مدير الطلبات", nameEn: "Order Manager",
    permissions: ["dashboard.view", "orders.view", "orders.manage", "customers.view", "delivery.manage", "payments.view", "notifications.view", "inventory.view"],
  },
  {
    key: "FULFILLMENT_PARTNER", nameAr: "شريك التنفيذ", nameEn: "Fulfillment Partner",
    permissions: ["orders.view", "orders.manage", "inventory.view", "inventory.manage"],
  },
  {
    key: "FINANCE_VIEWER", nameAr: "مراجع مالي", nameEn: "Finance Viewer",
    permissions: ["dashboard.view", "orders.view", "payments.view", "commissions.view", "reports.view"],
  },
];

export function hasPermission(perms: unknown, p: Permission) {
  return Array.isArray(perms) && perms.includes(p);
}
