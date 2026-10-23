"use client";
import { useActionState } from "react";
import { trackOrder } from "@/app/actions/track";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";

export function TrackForm() {
  const t = useT();
  const [state, action, pending] = useActionState(trackOrder, undefined);
  return (
    <form action={action} className="mt-10 w-full space-y-4 text-start">
      <div>
        <label htmlFor="number" className="label">{t("رقم الطلب", "Order number")}</label>
        <input id="number" name="number" required dir="ltr" placeholder="DL26123456" className="field text-start font-mono uppercase" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="phone" className="label">{t("رقم الجوال", "Mobile number")}</label>
        <input id="phone" name="phone" type="tel" required dir="ltr" placeholder="059 123 4567" className="field text-start" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error === "NOT_FOUND" ? t("لم نجد طلباً بهذه البيانات.", "We couldn't find an order with those details.") : errorLabel(t.locale, state.error)}
        </p>
      )}
      <button disabled={pending} className="btn-primary h-12 w-full">{t("تتبع الطلب", "Track order")}</button>
    </form>
  );
}
