"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";

type Facets = {
  categories: { slug: string; nameAr: string; nameEn: string; count: number }[];
  brands: { slug: string; nameAr: string; nameEn: string }[];
  minPrice: number;
  maxPrice: number;
};

function useQueryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    next.delete("page");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { sp, set, pending };
}

export function SortSelect() {
  const t = useT();
  const { sp, set } = useQueryNav();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-plum-500 sm:inline">{t("ترتيب:", "Sort:")}</span>
      <select value={sp.get("sort") ?? "featured"} onChange={(e) => set({ sort: e.target.value === "featured" ? null : e.target.value })}
        className="h-10 rounded-full border border-ivory-300 bg-white/70 px-4 pe-8 text-sm focus:border-plum focus:outline-none">
        <option value="featured">{t("المميز", "Featured")}</option>
        <option value="new">{t("الأحدث", "Newest")}</option>
        <option value="popular">{t("الأكثر مبيعاً", "Best selling")}</option>
        <option value="price_asc">{t("السعر: من الأقل", "Price: low to high")}</option>
        <option value="price_desc">{t("السعر: من الأعلى", "Price: high to low")}</option>
      </select>
    </label>
  );
}

function FilterPanel({ facets }: { facets: Facets }) {
  const t = useT();
  const l = t.locale;
  const { sp, set, pending } = useQueryNav();
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  useEffect(() => { setMin(sp.get("min") ?? ""); setMax(sp.get("max") ?? ""); }, [sp]);
  const active = sp.get("category");

  return (
    <div className={cn("space-y-9 transition-opacity", pending && "opacity-60")}>
      <fieldset>
        <legend className="eyebrow mb-4">{t("الفئة", "Category")}</legend>
        <ul className="space-y-1">
          <li>
            <button onClick={() => set({ category: null })} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition hover:bg-blush-50", !active && "bg-blush-50 font-semibold")}>
              {t("الكل", "All")}
            </button>
          </li>
          {facets.categories.map((c) => (
            <li key={c.slug}>
              <button onClick={() => set({ category: c.slug })} aria-pressed={active === c.slug}
                className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition hover:bg-blush-50", active === c.slug && "bg-blush-50 font-semibold")}>
                <span>{l === "ar" ? c.nameAr : c.nameEn}</span>
                <span className="text-xs text-plum-400 tabular-nums">{c.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {facets.brands.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-4">{t("العلامة التجارية", "Brand")}</legend>
          <div className="flex flex-wrap gap-2">
            {facets.brands.map((b) => (
              <button key={b.slug} onClick={() => set({ brand: sp.get("brand") === b.slug ? null : b.slug })} aria-pressed={sp.get("brand") === b.slug}
                className={cn("chip", sp.get("brand") === b.slug && "border-plum bg-plum text-ivory")}>{l === "ar" ? b.nameAr : b.nameEn}</button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-4">{t("السعر (₪)", "Price (₪)")}</legend>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ min: min || null, max: max || null }); }}>
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(facets.minPrice)} aria-label={t("أقل سعر", "Min price")} className="field h-10 text-sm" />
          <span className="text-plum-400">–</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(facets.maxPrice)} aria-label={t("أعلى سعر", "Max price")} className="field h-10 text-sm" />
          <button className="btn-primary btn-sm h-10 px-4" aria-label={t("تطبيق", "Apply")}><Icon name="check" className="h-4 w-4" /></button>
        </form>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4">{t("التوفر", "Availability")}</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-plum" checked={sp.get("availability") === "in_stock"} onChange={(e) => set({ availability: e.target.checked ? "in_stock" : null })} />
          {t("متوفر ومؤكَّد فقط", "Confirmed in stock only")}
        </label>
      </fieldset>

      {[...sp.keys()].some((k) => ["category", "brand", "min", "max", "availability", "q"].includes(k)) && (
        <button onClick={() => set({ category: null, brand: null, min: null, max: null, availability: null, q: null })} className="text-sm font-semibold link-underline">
          {t("مسح كل الفلاتر", "Clear all filters")}
        </button>
      )}
    </div>
  );
}

export function ShopFilters({ facets, mode }: { facets: Facets; mode: "sidebar" | "mobile" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const sp = useSearchParams();
  useEffect(() => setOpen(false), [sp]);
  if (mode === "sidebar") return <aside className="hidden lg:block" aria-label={t("الفلاتر", "Filters")}><FilterPanel facets={facets} /></aside>;
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary btn-sm h-10 lg:hidden"><Icon name="filter" className="h-4 w-4" />{t("فلترة", "Filter")}</button>
      <Sheet open={open} onClose={() => setOpen(false)} side="bottom" label={t("الفلاتر", "Filters")}>
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4">
          <h2 className="display text-xl">{t("الفلاتر", "Filters")}</h2>
          <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center" aria-label={t("إغلاق", "Close")}><Icon name="close" /></button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto px-6 py-6"><FilterPanel facets={facets} /></div>
      </Sheet>
    </>
  );
}
