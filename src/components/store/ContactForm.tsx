"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const t = useT();
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("sending"); setErrors({}); setFormError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).catch(() => null);
    if (res?.ok) { setState("ok"); return; }
    const body = await res?.json().catch(() => null);
    if (body?.fields) setErrors(body.fields); else setFormError(body?.error ?? "SERVER");
    setState("idle");
  };

  if (state === "ok") return <div role="status" className="py-10 text-center"><p className="display text-2xl">{t("وصلتنا رسالتك ✦", "Message received ✦")}</p><p className="mt-2 text-plum-600">{t("سنتواصل معك قريباً.", "We'll be in touch soon.")}</p></div>;
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-danger">{errorLabel(t.locale, errors[k])}</p>;
  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2"><label htmlFor="c-name" className="label">{t("الاسم", "Name")} *</label><input id="c-name" name="name" required className={cn("field", errors.name && "field-error")} />{err("name")}</div>
      <div><label htmlFor="c-phone" className="label">{t("الجوال", "Mobile")}</label><input id="c-phone" name="phone" type="tel" dir="ltr" className={cn("field text-start", errors.phone && "field-error")} />{err("phone")}</div>
      <div><label htmlFor="c-email" className="label">{t("البريد الإلكتروني", "Email")}</label><input id="c-email" name="email" type="email" dir="ltr" className={cn("field text-start", errors.email && "field-error")} />{err("email")}</div>
      <div className="sm:col-span-2"><label htmlFor="c-msg" className="label">{t("رسالتك", "Message")} *</label><textarea id="c-msg" name="message" rows={5} required className={cn("field", errors.message && "field-error")} />{err("message")}</div>
      <p className="text-xs text-plum-500 sm:col-span-2">{t("يُرجى إدخال الجوال أو البريد لنتمكن من الرد.", "Please provide a mobile number or email so we can reply.")}</p>
      {formError && <p role="alert" className="text-sm text-danger sm:col-span-2">{errorLabel(t.locale, formError)}</p>}
      <button disabled={state === "sending"} className="btn-primary sm:col-span-2">{t("إرسال", "Send message")}</button>
    </form>
  );
}
