"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "light" }: { tone?: "light" | "dark" }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale: t.locale }),
    }).catch(() => null);
    setState(res?.ok ? "ok" : "error");
  };
  if (state === "ok") return <p role="status" className="text-sm font-medium">{t("شكراً لانضمامك! ✦", "Thank you for joining! ✦")}</p>;
  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className={cn("flex items-center gap-2 rounded-full border p-1.5", tone === "dark" ? "border-ivory/25 bg-ivory/5" : "border-plum/15 bg-white/70")}>
        <label htmlFor={`nl-${tone}`} className="sr-only">{t("البريد الإلكتروني", "Email address")}</label>
        <input id={`nl-${tone}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("بريدك الإلكتروني", "Your email")}
          className={cn("h-11 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none", tone === "dark" ? "text-ivory placeholder:text-ivory/50" : "placeholder:text-plum-400")} />
        <button disabled={state === "loading"} className={cn("btn h-11 px-5", tone === "dark" ? "bg-ivory text-plum hover:bg-blush" : "bg-plum text-ivory hover:bg-plum-700")}>
          {t("اشتركي", "Subscribe")}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-danger">{t("تعذّر الاشتراك، تأكدي من البريد.", "Couldn't subscribe. Please check the email.")}</p>}
      <p className={cn("mt-2 text-xs", tone === "dark" ? "text-ivory/50" : "text-plum-500")}>{t("يمكنك إلغاء الاشتراك في أي وقت.", "Unsubscribe anytime.")}</p>
    </form>
  );
}
