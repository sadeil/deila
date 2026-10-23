import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export async function AnnouncementBar() {
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const a = s.announcement;
  const text = t.locale === "ar" ? a.textAr : a.textEn;
  if (!a.enabled || !text) return null;
  const inner = (
    <span className="inline-flex items-center gap-3">
      <span className="text-gold" aria-hidden>✦</span>{text}<span className="text-gold" aria-hidden>✦</span>
    </span>
  );
  return (
    <div className="bg-plum text-ivory">
      <div className="container flex min-h-9 items-center justify-center py-2 text-center text-[12px] font-medium tracking-wide">
        {a.link ? <Link href={a.link} className="transition hover:text-blush">{inner}</Link> : inner}
      </div>
    </div>
  );
}
