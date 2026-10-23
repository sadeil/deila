"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";

export type Img = { url: string; altAr: string; altEn: string };

async function upload(file: File, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "UPLOAD_FAILED");
  return d.url as string;
}

/** Multi-image manager: upload, remove, reorder (drag or arrows), per-image alt text. */
export function ImageManager({ value, onChange }: { value: Img[]; onChange: (v: Img[]) => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const next = [...value];
    for (const f of Array.from(files).slice(0, 10)) {
      try { next.push({ url: await upload(f, "products"), altAr: "", altEn: "" }); }
      catch (e) { setError(String((e as Error).message)); }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((img, i) => (
          <li key={img.url + i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
            className={cn("group rounded-xl border border-ivory-200 bg-white p-2", drag === i && "opacity-50")}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-ivory-100">
              <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
              {i === 0 && <span className="absolute start-1.5 top-1.5 rounded-full bg-plum px-2 py-0.5 text-[10px] font-semibold text-ivory">{t("الرئيسية", "Main")}</span>}
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/90" aria-label={t("تحريك للأمام", "Move earlier")}><Icon name="chevron" className="h-3.5 w-3.5 rotate-180 flip-rtl" /></button>
                  <button type="button" onClick={() => move(i, i + 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/90" aria-label={t("تحريك للخلف", "Move later")}><Icon name="chevron" className="h-3.5 w-3.5 flip-rtl" /></button>
                </span>
                <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-danger" aria-label={t("حذف الصورة", "Remove image")}><Icon name="trash" className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <input value={img.altAr} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, altAr: e.target.value } : x)))} placeholder={t("وصف بالعربية", "Alt (Arabic)")} className="mt-2 h-8 w-full rounded-md border border-ivory-200 px-2 text-xs" />
            <input value={img.altEn} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, altEn: e.target.value } : x)))} placeholder={t("وصف بالإنجليزية", "Alt (English)")} dir="ltr" className="mt-1 h-8 w-full rounded-md border border-ivory-200 px-2 text-xs" />
          </li>
        ))}
        <li>
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ivory-300 text-sm text-plum-500 hover:border-plum hover:text-plum">
            {busy ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-plum/20 border-t-plum" /> : <Icon name="upload" className="h-6 w-6" />}
            {t("رفع صور", "Upload images")}
            <span className="text-[10px]">JPG · PNG · WEBP · ≤5MB</span>
          </button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => add(e.target.files)} />
        </li>
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error === "UNSUPPORTED_FILE" ? t("نوع الملف غير مدعوم", "Unsupported file type") : error === "FILE_TOO_LARGE" ? t("الملف أكبر من 5MB", "File exceeds 5MB") : t("فشل الرفع", "Upload failed")}</p>}
    </div>
  );
}

/** Single image field (categories, homepage sections). */
export function SingleImage({ name, defaultValue, folder = "content" }: { name: string; defaultValue?: string | null; folder?: string }) {
  const t = useT();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={url} />
      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ivory-100">{url && <Image src={url} alt="" fill sizes="56px" className="object-cover" />}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-secondary btn-sm h-8">{busy ? "…" : t("تغيير الصورة", "Change image")}</button>
        {url && <button type="button" onClick={() => setUrl("")} className="btn-ghost btn-sm h-8">{t("إزالة", "Remove")}</button>}
      </div>
      <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setBusy(true);
        try { setUrl(await upload(f, folder)); } catch { alert(t("فشل الرفع", "Upload failed")); }
        setBusy(false);
      }} />
    </div>
  );
}
