import { cache } from "react";
import { db } from "./db";
import type { Prisma } from "@prisma/client";

export const SETTINGS_DEFAULTS = {
  store: {
    nameAr: "ديلا", nameEn: "DELLA",
    taglineAr: "أجهزة صُنعت لكِ.", taglineEn: "Gadgets Made for Her.",
    email: "", phone: "", whatsapp: "",
    addressAr: "فلسطين", addressEn: "Palestine",
    currency: "ILS",
    defaultLocale: "ar" as "ar" | "en",
    logoUrl: "",
  },
  social: { instagram: "", facebook: "", tiktok: "", whatsapp: "" },
  announcement: { enabled: true, textAr: "", textEn: "", link: "" },
  footer: { aboutAr: "", aboutEn: "" },
  seo: { titleAr: "", titleEn: "", descAr: "", descEn: "" },
  policies: { warrantyAr: "", warrantyEn: "", returnsAr: "", returnsEn: "", deliveryAr: "", deliveryEn: "" },
  payments: { codEnabled: true, cardEnabled: false, merchantOfRecord: "PARTNER" as "PARTNER" | "DELLA" },
  commission: { defaultType: "PERCENT" as "PERCENT" | "FIXED", defaultValue: 1000 },
  notifications: { adminEmail: "", emailCustomers: true, whatsappCustomers: false, lowStockAlerts: true },
  catalog: { showDemoNotice: true, maxQtyPerItem: 5 },
};
export type Settings = typeof SETTINGS_DEFAULTS;
export type SettingsKey = keyof Settings;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.storeSetting.findMany();
  const out = structuredClone(SETTINGS_DEFAULTS) as Settings;
  for (const r of rows) {
    const k = r.key as SettingsKey;
    if (k in out && r.value && typeof r.value === "object") {
      Object.assign(out[k] as object, r.value as object);
    }
  }
  return out;
});

export async function saveSetting<K extends SettingsKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await db.storeSetting.findUnique({ where: { key } }))?.value ?? {};
  const merged = { ...SETTINGS_DEFAULTS[key], ...(current as object), ...value } as Prisma.InputJsonValue;
  await db.storeSetting.upsert({ where: { key }, create: { key, value: merged }, update: { value: merged } });
}
