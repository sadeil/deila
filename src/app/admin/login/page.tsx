import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { Wordmark } from "@/components/brand/Wordmark";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  const t = await getT();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-plum lg:block">
        <div className="absolute -start-24 -top-24 h-96 w-96 rounded-full border border-gold/30" />
        <div className="absolute -bottom-32 end-10 h-[28rem] w-[28rem] rounded-full bg-blush/10 blur-2xl" />
        <div className="relative flex h-full flex-col justify-between p-14 text-ivory">
          <Wordmark tone="light" className="h-8" />
          <div>
            <p className="display text-display-md text-blush">{t("مركز إدارة ديلا", "DELLA Control Centre")}</p>
            <p className="mt-4 max-w-sm text-ivory/60">{t("الطلبات، المنتجات، العمولات والمحتوى — في مكان واحد آمن.", "Orders, products, commissions and content — in one secure place.")}</p>
          </div>
          <p className="text-xs text-ivory/40">{t("للموظفين المصرّح لهم فقط. يتم تسجيل كل الأنشطة.", "Authorised staff only. All activity is logged.")}</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-ivory p-6">
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 h-6 lg:hidden" />
          <h1 className="display text-display-sm">{t("تسجيل دخول الإدارة", "Staff sign in")}</h1>
          <p className="mt-2 text-sm text-plum-500">{t("لا يمكن إنشاء حسابات إدارية من هنا.", "Admin accounts cannot be created here.")}</p>
          <div className="mt-8"><AdminLoginForm /></div>
        </div>
      </div>
    </div>
  );
}
