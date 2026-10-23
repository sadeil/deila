/** All money is stored as integer agorot (1 ₪ = 100 agorot). */
export function formatMoney(agorot: number, locale: "ar" | "en" = "ar") {
  const value = agorot / 100;
  const hasFraction = agorot % 100 !== 0;
  const n = new Intl.NumberFormat(locale === "ar" ? "ar-PS-u-nu-latn" : "en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
  return locale === "ar" ? `${n} ₪` : `₪${n}`;
}

/** Parse a shekel amount typed by an admin ("149.90") into agorot. */
export function toAgorot(input: string | number): number {
  const s = typeof input === "number" ? String(input) : input.trim().replace(/[₪,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("Invalid amount");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export const fromAgorot = (a: number) => (a / 100).toFixed(2);
