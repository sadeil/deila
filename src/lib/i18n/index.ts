import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

export type { Locale } from "./types";
import type { Locale } from "./types";
export const LOCALE_COOKIE = "della_locale";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "en" ? "en" : "ar";
});

/** Server helper: const t = await getT(); t("مرحبا", "Hello") */
export async function getT() {
  const l = await getLocale();
  return Object.assign((ar: string, en: string) => (l === "ar" ? ar : en), { locale: l, dir: l === "ar" ? "rtl" : "ltr" });
}

export const pickLoc = <T,>(l: Locale, ar: T, en: T) => (l === "ar" ? ar : en);
