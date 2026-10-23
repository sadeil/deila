import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { AuthShell } from "@/components/account/AuthShell";
import { RegisterForm } from "@/components/account/AuthForms";

export const metadata = { robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCustomer()) redirect("/account");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthShell eyebrow={t("انضمي إلى ديلا", "Join DELLA")} title={t("إنشاء حساب", "Create an account")}>
      <RegisterForm next={sp.next} />
    </AuthShell>
  );
}
