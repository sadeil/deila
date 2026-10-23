"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Icon } from "../ui/Icon";

export function ShareButton({ title }: { title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-sm text-plum-600 hover:text-plum"
      onClick={async () => {
        const url = window.location.href.split("?")[0];
        try {
          if (navigator.share) await navigator.share({ title, url });
          else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
        } catch {}
      }}
    >
      <Icon name={copied ? "check" : "share"} className="h-4 w-4" />
      <span role="status">{copied ? t("تم نسخ الرابط", "Link copied") : t("مشاركة", "Share")}</span>
    </button>
  );
}
