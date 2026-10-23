"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";

type R = { ok?: boolean; error?: string; fields?: Record<string, string | undefined>; message?: string } | undefined;

const ADMIN_ERRORS: Record<string, [string, string]> = {
  DUPLICATE: ["القيمة مستخدمة مسبقاً (مثل SKU أو الرابط أو الكود)", "That value is already in use (e.g. SKU, slug or code)"],
  VALIDATION: ["يرجى تصحيح الحقول المميزة", "Please correct the highlighted fields"],
  IN_USE: ["لا يمكن الحذف لأنه مرتبط بسجلات أخرى — يمكنك أرشفته بدلاً من ذلك", "Can't delete because other records depend on it — archive it instead"],
  NOTHING_TO_SETTLE: ["لا توجد عمولات مستحقة للتسوية", "There are no earned commissions to settle"],
  INVALID_CODE: ["الكود يجب أن يكون 3–30 حرفاً إنجليزياً أو أرقاماً", "Code must be 3–30 letters, digits, - or _"],
  LAST_SUPER_ADMIN: ["يجب أن يبقى مدير عام واحد فعّال على الأقل", "At least one active Super Admin must remain"],
};

/** Wraps a server action: shows pending state, success toast and mapped errors. */
export function ActionForm({ action, children, className, success, resetOnSuccess, onSuccess }: {
  action: (prev: R, form: FormData) => Promise<R>;
  children: React.ReactNode;
  className?: string;
  success?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) {
      setToast(state.message ?? success ?? t("تم الحفظ", "Saved"));
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
      const id = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(id);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const err = state?.error ? (ADMIN_ERRORS[state.error] ? (t.locale === "ar" ? ADMIN_ERRORS[state.error][0] : ADMIN_ERRORS[state.error][1]) : errorLabel(t.locale, state.error)) : null;

  return (
    <form ref={ref} action={formAction} className={cn(pending && "pointer-events-none opacity-70", className)} aria-busy={pending}>
      {children}
      {err && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{err}{state?.fields && <> — {Object.keys(state.fields).join(", ")}</>}</p>}
      {toast && typeof document !== "undefined" && createPortal(
        <div role="status" className="fixed bottom-6 start-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-plum px-5 py-3 text-sm text-ivory shadow-lift rtl:translate-x-1/2">
          <Icon name="check" className="h-4 w-4 text-gold" />{toast}
        </div>, document.body)}
    </form>
  );
}

/** Submit button that asks for confirmation first (for destructive or irreversible actions). */
export function ConfirmButton({ children, message, className, name, value }: { children: React.ReactNode; message: string; className?: string; name?: string; value?: string }) {
  return (
    <button type="submit" name={name} value={value} className={className}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return <button type="submit" className={cn("btn-primary btn-sm h-10", className)}>{children}</button>;
}
