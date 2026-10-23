import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({ amount, compareAt, locale, className, size = "md" }: {
  amount: number; compareAt?: number | null; locale: "ar" | "en"; className?: string; size?: "sm" | "md" | "lg";
}) {
  const sale = compareAt && compareAt > amount;
  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}>
      <span className={cn("font-semibold", size === "lg" && "text-2xl", size === "sm" && "text-sm", sale && "text-danger")}>
        {formatMoney(amount, locale)}
      </span>
      {sale ? (
        <s className="text-sm text-plum-400" aria-label={locale === "ar" ? "السعر قبل الخصم" : "Original price"}>
          {formatMoney(compareAt!, locale)}
        </s>
      ) : null}
    </span>
  );
}
