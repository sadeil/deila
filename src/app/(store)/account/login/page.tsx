import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { AuthShell } from "@/components/account/AuthShell";
import { LoginForm } from "@/components/account/AuthForms";

export const metadata = { robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await getCustomer()) redirect("/account");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthShell eyebrow={t("أهلاً بعودتك", "Welcome back")} title={t("تسجيل الدخول", "Sign in")}>
      {sp.reset && <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("تم تغيير كلمة المرور. سجّلي الدخول الآن.", "Password updated. Please sign in.")}</p>}
      <LoginForm next={sp.next} />
    </AuthShell>
  );
}
