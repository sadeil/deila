import type { Metadata, Viewport } from "next";
import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--f-cormorant", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-manrope", display: "swap" });
const plexAr = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--f-plex-ar", display: "swap" });
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], variable: "--f-amiri", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [l, s] = await Promise.all([getLocale(), getSettings()]);
  const title = (l === "ar" ? s.seo.titleAr : s.seo.titleEn) || "DELLA — Gadgets Made for Her";
  const description = (l === "ar" ? s.seo.descAr : s.seo.descEn) || undefined;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${l === "ar" ? "ديلا" : "DELLA"}` },
    description,
    applicationName: "DELLA",
    openGraph: { type: "website", siteName: "DELLA", title, description, locale: l === "ar" ? "ar_PS" : "en_US"},
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { themeColor: "#F9F3EF", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${cormorant.variable} ${manrope.variable} ${plexAr.variable} ${amiri.variable}`}>
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
