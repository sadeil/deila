"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Icon } from "../ui/Icon";

export function CopyCode({ code }: { code: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1600); } catch {}
      }}
      className="btn h-12 border border-dashed border-plum/40 bg-white/60 px-6 font-mono tracking-[.2em] hover:bg-white"
      aria-label={t(`نسخ الكود ${code}`, `Copy code ${code}`)}
    >
      {code}
      <Icon name={done ? "check" : "copy"} className="h-4 w-4" />
      <span className="sr-only" role="status">{done ? t("تم النسخ", "Copied") : ""}</span>
    </button>
  );
}
