"use client";
import { useActionState } from "react";
import { adminLogin } from "@/app/admin/actions/auth";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";

export function AdminLoginForm() {
  const t = useT();
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">{t("البريد الإلكتروني", "Email")}</label>
        <input id="email" name="email" type="email" required autoComplete="username" dir="ltr" className="field text-start" />
      </div>
      <div>
        <label htmlFor="password" className="label">{t("كلمة المرور", "Password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className="field text-start" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{errorLabel(t.locale, state.error)}</p>}
      <button disabled={pending} className="btn-primary h-12 w-full">{pending ? t("جارٍ التحقق…", "Verifying…") : t("دخول", "Sign in")}</button>
    </form>
  );
}
