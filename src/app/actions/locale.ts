"use server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function setLocale(locale: "ar" | "en") {
  (await cookies()).set(LOCALE_COOKIE, locale === "en" ? "en" : "ar", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
