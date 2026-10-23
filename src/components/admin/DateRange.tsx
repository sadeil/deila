"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function DateRange({ from, to }: { from: string; to: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const go = (f: string, tt: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("from", f); p.set("to", tt);
    router.push(`${pathname}?${p.toString()}`);
  };
  const preset = (days: number) => { const end = new Date(); const start = new Date(end.getTime() - (days - 1) * 86400_000); go(ymd(start), ymd(end)); };
  const activeDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400_000) + 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-ivory-200 bg-white p-0.5 text-xs">
        {[[7, t("٧ أيام", "7d")], [30, t("٣٠ يوماً", "30d")], [90, t("٩٠ يوماً", "90d")], [365, t("سنة", "1y")]].map(([d, label]) => (
          <button key={d} onClick={() => preset(Number(d))} className={cn("rounded-full px-3 py-1.5 font-medium", activeDays === d && to === ymd(new Date()) ? "bg-plum text-ivory" : "hover:bg-ivory-100")}>{label}</button>
        ))}
      </div>
      <form className="flex items-center gap-1.5 text-xs" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); go(String(f.get("from")), String(f.get("to"))); }}>
        <input type="date" name="from" defaultValue={from} aria-label={t("من", "From")} className="h-9 rounded-full border border-ivory-200 bg-white px-3" />
        <span>–</span>
        <input type="date" name="to" defaultValue={to} aria-label={t("إلى", "To")} className="h-9 rounded-full border border-ivory-200 bg-white px-3" />
        <button className="btn-secondary btn-sm h-9">{t("تطبيق", "Apply")}</button>
      </form>
    </div>
  );
}
