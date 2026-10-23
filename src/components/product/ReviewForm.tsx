"use client";
import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";

export function ReviewForm({ productId }: { productId: string }) {
  const t = useT();
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState(submitReview, null);
  if (state?.ok) return <p role="status" className="rounded-2xl bg-blush-50 p-5 text-sm">{t("شكراً! ستظهر مراجعتك بعد المراجعة.", "Thank you! Your review will appear once approved.")}</p>;
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="font-semibold">{t("قيّمي المنتج", "Rate this product")}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={t("التقييم", "Rating")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} aria-label={`${n}/5`}>
            <Icon name="star" className={cn("h-6 w-6 text-gold", n <= rating && "fill-gold")} />
          </button>
        ))}
      </div>
      <textarea name="body" required minLength={10} maxLength={1000} rows={4} className="field" placeholder={t("شاركي تجربتك…", "Share your experience…")} />
      {state?.error && <p className="text-sm text-danger">{state.error === "FORBIDDEN" ? t("يمكن التقييم فقط بعد استلام طلب يحتوي هذا المنتج.", "You can review only after receiving an order containing this product.") : errorLabel(t.locale, state.error)}</p>}
      <button disabled={pending} className="btn-primary">{t("إرسال", "Submit")}</button>
    </form>
  );
}
