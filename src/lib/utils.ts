import { clsx, type ClassValue } from "clsx";
export const cn = (...c: ClassValue[]) => clsx(c);

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export type Spec = { labelAr: string; labelEn: string; valueAr: string; valueEn: string };
export function asSpecs(v: unknown): Spec[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is Spec => !!s && typeof s === "object" && "labelEn" in s);
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

/** Normalise Palestinian / Israeli mobile numbers to 05XXXXXXXX. */
export function normalizePhone(raw: string) {
  let d = raw.replace(/[^\d+]/g, "");
  d = d.replace(/^\+?(970|972)/, "0");
  if (/^5\d{8}$/.test(d)) d = "0" + d;
  return d;
}
export const isValidPhone = (p: string) => /^05\d{8}$/.test(normalizePhone(p));
