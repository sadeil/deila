"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { saveSection } from "@/app/admin/actions/system";
import { useT } from "@/lib/i18n/client";
import { Icon } from "../ui/Icon";
import { ActionForm } from "./ActionForm";

type Cfg = Record<string, unknown>;
type FieldDef = { key: string; label: [string, string]; kind?: "text" | "textarea" | "image" | "number" | "product" | "category"; ltr?: boolean };

const PAIR = (k: string, ar: string, en: string, kind: FieldDef["kind"] = "text"): FieldDef[] => [
  { key: `${k}Ar`, label: [`${ar} (ع)`, `${en} (AR)`], kind },
  { key: `${k}En`, label: [`${ar} (EN)`, `${en} (EN)`], kind, ltr: true },
];

const FIELDS: Record<string, FieldDef[]> = {
  HERO: [
    ...PAIR("eyebrow", "سطر علوي", "Eyebrow"), ...PAIR("body", "النص", "Body", "textarea"),
    ...PAIR("primaryLabel", "زر رئيسي", "Primary button"), { key: "primaryHref", label: ["رابط الزر الرئيسي", "Primary link"], ltr: true },
    ...PAIR("secondaryLabel", "زر ثانوي", "Secondary button"), { key: "secondaryHref", label: ["رابط الزر الثانوي", "Secondary link"], ltr: true },
    { key: "image", label: ["الصورة", "Image"], kind: "image" },
    { key: "productSlug", label: ["المنتج المعروض على البطاقة", "Product shown on the card"], kind: "product" },
  ],
  SPOTLIGHT: [{ key: "productSlug", label: ["المنتج", "Product"], kind: "product" }, ...PAIR("body", "النص", "Body", "textarea")],
  STORY: [...PAIR("body", "النص", "Body", "textarea"), { key: "image", label: ["الصورة", "Image"], kind: "image" }],
  OFFERS: [...PAIR("body", "النص", "Body", "textarea"), { key: "code", label: ["كود الخصم", "Coupon code"], ltr: true }, { key: "href", label: ["الرابط", "Link"], ltr: true }],
  FEATURED: [{ key: "limit", label: ["عدد المنتجات", "Number of products"], kind: "number" }],
  NEW_ARRIVALS: [{ key: "limit", label: ["عدد المنتجات", "Number of products"], kind: "number" }],
  BEST_SELLERS: [{ key: "limit", label: ["عدد المنتجات", "Number of products"], kind: "number" }],
  LIFESTYLE: [{ key: "categorySlug", label: ["الفئة", "Category"], kind: "category" }, { key: "limit", label: ["عدد المنتجات", "Number of products"], kind: "number" }],
  NEWSLETTER: PAIR("body", "النص", "Body", "textarea"),
};

const ITEM_FIELDS: Record<string, FieldDef[]> = {
  COLLECTIONS: [...PAIR("title", "العنوان", "Title"), { key: "href", label: ["الرابط", "Link"], ltr: true }, { key: "image", label: ["الصورة", "Image"], kind: "image" }],
  WHY: [{ key: "icon", label: ["الأيقونة", "Icon"], ltr: true }, ...PAIR("title", "العنوان", "Title"), ...PAIR("body", "النص", "Body", "textarea")],
};

async function upload(file: File) {
  const fd = new FormData();
  fd.append("file", file); fd.append("folder", "content");
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error();
  return (await r.json()).url as string;
}

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <span className="relative h-14 w-12 overflow-hidden rounded-lg bg-ivory-100">{value && <Image src={value} alt="" fill sizes="48px" className="object-cover" />}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className="field h-9 flex-1 text-xs" placeholder="/uploads/…" />
      <button type="button" onClick={() => ref.current?.click()} className="btn-secondary btn-sm h-9"><Icon name="upload" className="h-4 w-4" />{t("رفع", "Upload")}</button>
      <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { onChange(await upload(f)); } catch { alert("Upload failed"); } } }} />
    </div>
  );
}

export function SectionEditor({ section, products, categories }: {
  section: { id: string; type: string; titleAr: string | null; titleEn: string | null; visible: boolean; config: Cfg };
  products: { slug: string; label: string }[];
  categories: { slug: string; label: string }[];
}) {
  const t = useT();
  const [cfg, setCfg] = useState<Cfg>(section.config);
  const set = (k: string, v: unknown) => setCfg((c) => ({ ...c, [k]: v }));
  const items = (Array.isArray(cfg.items) ? cfg.items : []) as Cfg[];
  const setItems = (next: Cfg[]) => set("items", next);

  const renderField = (f: FieldDef, value: unknown, onChange: (v: unknown) => void) => {
    const label = <span className="label">{t(f.label[0], f.label[1])}</span>;
    const str = typeof value === "string" ? value : value == null ? "" : String(value);
    if (f.kind === "image") return <div key={f.key}>{label}<ImageInput value={str} onChange={onChange} /></div>;
    if (f.kind === "textarea") return <label key={f.key}>{label}<textarea value={str} onChange={(e) => onChange(e.target.value)} rows={3} dir={f.ltr ? "ltr" : undefined} className="field text-sm" /></label>;
    if (f.kind === "number") return <label key={f.key}>{label}<input type="number" min={1} max={12} value={str} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} className="field h-10 text-sm" /></label>;
    if (f.kind === "product" || f.kind === "category") {
      const opts = f.kind === "product" ? products : categories;
      return <label key={f.key}>{label}<select value={str} onChange={(e) => onChange(e.target.value)} className="field h-10 text-sm"><option value="">—</option>{opts.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></label>;
    }
    return <label key={f.key}>{label}<input value={str} onChange={(e) => onChange(e.target.value)} dir={f.ltr ? "ltr" : undefined} className="field h-10 text-sm" /></label>;
  };

  return (
    <ActionForm action={saveSection} className="space-y-4">
      <input type="hidden" name="id" value={section.id} />
      <input type="hidden" name="config" value={JSON.stringify(cfg)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">{t("العنوان (ع)", "Title (AR)")}</span><input name="titleAr" defaultValue={section.titleAr ?? ""} className="field h-10 text-sm" /></label>
        <label><span className="label">{t("العنوان (EN)", "Title (EN)")}</span><input name="titleEn" defaultValue={section.titleEn ?? ""} dir="ltr" className="field h-10 text-sm" /></label>
        {(FIELDS[section.type] ?? []).map((f) => renderField(f, cfg[f.key], (v) => set(f.key, v)))}
      </div>
      {ITEM_FIELDS[section.type] && (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl bg-ivory-100/70 p-3">
              <div className="mb-2 flex justify-between text-xs font-semibold"><span>#{i + 1}</span><button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))} className="text-danger">{t("حذف", "Remove")}</button></div>
              <div className="grid gap-3 sm:grid-cols-2">{ITEM_FIELDS[section.type].map((f) => renderField(f, it[f.key], (v) => setItems(items.map((x, k) => (k === i ? { ...x, [f.key]: v } : x)))))}</div>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm h-8" onClick={() => setItems([...items, {}])}><Icon name="plus" className="h-3.5 w-3.5" />{t("إضافة عنصر", "Add item")}</button>
          {section.type === "WHY" && <p className="text-[11px] text-plum-500">{t("أيقونات متاحة: shield, truck, cash, chat, sparkle, heart, package, star", "Available icons: shield, truck, cash, chat, sparkle, heart, package, star")}</p>}
        </div>
      )}
      {section.type === "FEATURED" && <p className="text-[11px] text-plum-500">{t("المنتجات المعروضة هي المعلّمة كـ«مميز» في محرر المنتج.", "Products shown are those marked “Featured” in the product editor.")}</p>}
      {section.type === "BEST_SELLERS" && <p className="text-[11px] text-plum-500">{t("يعتمد على المبيعات الفعلية فقط ويختفي إن لم توجد مبيعات.", "Based on real sales only; hidden when there are none.")}</p>}
      {section.type === "REVIEWS" && <p className="text-[11px] text-plum-500">{t("يعرض المراجعات الموثّقة المعتمدة فقط.", "Shows approved, verified reviews only.")}</p>}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={section.visible} className="accent-plum" />{t("ظاهر", "Visible")}</label>
        <button className="btn-primary btn-sm h-9">{t("حفظ القسم", "Save section")}</button>
      </div>
    </ActionForm>
  );
}
