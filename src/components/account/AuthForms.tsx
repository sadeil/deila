"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword } from "@/app/actions/account";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

type S = { error?: string; fields?: Record<string, string>; ok?: boolean } | undefined;

function Field({ name, label, type = "text", state, ltr, autoComplete }: {
  name: string; label: string; type?: string; state: S; ltr?: boolean; autoComplete?: string;
}) {
  const t = useT();
  const e = state?.fields?.[name];
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} autoComplete={autoComplete} dir={ltr ? "ltr" : undefined}
        aria-invalid={!!e} aria-describedby={e ? `${name}-e` : undefined}
        className={cn("field", ltr && "text-start", e && "field-error")} />
      {e && <p id={`${name}-e`} className="mt-1.5 text-xs text-danger">{errorLabel(t.locale, e)}</p>}
    </div>
  );
}

function FormError({ state }: { state: S }) {
  const t = useT();
  return state?.error ? <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{errorLabel(t.locale, state.error)}</p> : null;
}

export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field name="email" type="email" label={t("البريد الإلكتروني", "Email")} state={state} ltr autoComplete="email" />
      <Field name="password" type="password" label={t("كلمة المرور", "Password")} state={state} ltr autoComplete="current-password" />
      <FormError state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">{t("تسجيل الدخول", "Sign in")}</button>
      <div className="flex justify-between text-sm">
        <Link href="/account/reset" className="link-underline text-plum-600">{t("نسيتِ كلمة المرور؟", "Forgot password?")}</Link>
        <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold link-underline">{t("إنشاء حساب", "Create account")}</Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field name="name" label={t("الاسم", "Name")} state={state} autoComplete="name" />
      <Field name="email" type="email" label={t("البريد الإلكتروني", "Email")} state={state} ltr autoComplete="email" />
      <Field name="phone" type="tel" label={t("رقم الجوال (اختياري)", "Mobile (optional)")} state={state} ltr autoComplete="tel" />
      <Field name="password" type="password" label={t("كلمة المرور (8 أحرف على الأقل)", "Password (min 8 characters)")} state={state} ltr autoComplete="new-password" />
      <FormError state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">{t("إنشاء الحساب", "Create account")}</button>
      <p className="text-center text-sm">{t("لديك حساب؟ ", "Have an account? ")}<Link href="/account/login" className="font-semibold link-underline">{t("سجّلي الدخول", "Sign in")}</Link></p>
    </form>
  );
}

export function ResetRequestForm() {
  const t = useT();
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) return <p role="status" className="rounded-2xl bg-blush-50 p-5 text-sm">{t("إذا كان البريد مسجّلاً لدينا، ستصلك رسالة برابط إعادة التعيين.", "If that email is registered, you'll receive a reset link.")}</p>;
  return (
    <form action={action} className="space-y-5">
      <Field name="email" type="email" label={t("البريد الإلكتروني", "Email")} state={state} ltr autoComplete="email" />
      <FormError state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">{t("أرسلي الرابط", "Send reset link")}</button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field name="password" type="password" label={t("كلمة المرور الجديدة", "New password")} state={state} ltr autoComplete="new-password" />
      <FormError state={state} />
      <button disabled={pending} className="btn-primary h-12 w-full">{t("حفظ كلمة المرور", "Save password")}</button>
    </form>
  );
}
