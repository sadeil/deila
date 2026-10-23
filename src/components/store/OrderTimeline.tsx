import type { Locale } from "@/lib/i18n/types";
import { statusLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";

const FLOW = ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export function OrderTimeline({ l, status, history }: {
  l: Locale; status: string; history: { toValue: string; kind: string; createdAt: Date }[];
}) {
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const at = (s: string) => history.find((h) => h.kind === "STATUS" && h.toValue === s)?.createdAt;
  const terminal = status === "CANCELED" || status === "RETURNED";
  const reachedIdx = terminal
    ? Math.max(-1, ...FLOW.map((s, i) => (at(s) ? i : -1)))
    : FLOW.indexOf(status as (typeof FLOW)[number]);

  return (
    <ol className="relative space-y-0">
      {FLOW.map((s, i) => {
        const done = i <= reachedIdx;
        const current = !terminal && i === reachedIdx;
        const time = at(s);
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
            {i < FLOW.length - 1 && <span className={cn("absolute start-[11px] top-6 h-full w-px", i < reachedIdx ? "bg-plum" : "bg-ivory-300")} aria-hidden />}
            <span className={cn("relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border", done ? "border-plum bg-plum text-ivory" : "border-ivory-300 bg-ivory", current && "ring-4 ring-blush")}>
              {done && <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />}
            </span>
            <div className="-mt-0.5">
              <p className={cn("text-sm", done ? "font-semibold" : "text-plum-400")}>{statusLabel(l, s)}</p>
              {time && <p className="text-xs text-plum-500">{fmt.format(time)}</p>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="relative mt-7 flex gap-4">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-danger text-ivory"><Icon name="close" className="h-3 w-3" strokeWidth={2.5} /></span>
          <div className="-mt-0.5">
            <p className="text-sm font-semibold text-danger">{statusLabel(l, status)}</p>
            {at(status) && <p className="text-xs text-plum-500">{fmt.format(at(status)!)}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
