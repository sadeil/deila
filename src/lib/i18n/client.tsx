"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./types";

const Ctx = createContext<Locale>("ar");
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}
export const useLocale = () => useContext(Ctx);
export function useT() {
  const l = useLocale();
  return Object.assign((ar: string, en: string) => (l === "ar" ? ar : en), { locale: l });
}
