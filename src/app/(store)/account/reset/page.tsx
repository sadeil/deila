import { getT } from "@/lib/i18n";
import { AuthShell } from "@/components/account/AuthShell";
import { ResetPasswordForm, ResetRequestForm } from "@/components/account/AuthForms";

export const metadata = { robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthShell eyebrow={t("الحساب", "Account")} title={sp.token ? t("كلمة مرور جديدة", "Choose a new password") : t("إعادة تعيين كلمة المرور", "Reset password")}>
      {sp.token ? <ResetPasswordForm token={sp.token.slice(0, 100)} /> : <ResetRequestForm />}
    </AuthShell>
  );
}
