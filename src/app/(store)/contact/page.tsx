import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/store/ContactForm";
import { Icon } from "@/components/ui/Icon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("تواصلي معنا", "Contact us"), alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp.replace(/\D/g, "").replace(/^0/, "970")}` : null;
  return (
    <div className="container grid gap-14 pb-24 pt-12 md:pt-20 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="eyebrow">{t("نحن هنا لكِ", "We're here for you")}</p>
        <h1 className="display mt-3 text-display-lg">{t("تواصلي معنا", "Contact us")}</h1>
        <p className="mt-5 max-w-md text-plum-600">{t("سؤال عن منتج، طلب، أو تحتاجين نصيحة في الاختيار؟ اكتبي لنا وسنرد عليك بأقرب وقت.", "A question about a product or order, or need help choosing? Write to us and we'll get back to you soon.")}</p>
        <ul className="mt-10 space-y-4 text-sm">
          {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 link-underline"><Icon name="whatsapp" className="h-5 w-5 text-gold-600" />WhatsApp</a></li>}
          {s.store.phone && <li><a href={`tel:${s.store.phone}`} className="flex items-center gap-3" dir="ltr"><Icon name="phone" className="h-5 w-5 text-gold-600" />{s.store.phone}</a></li>}
          {s.store.email && <li><a href={`mailto:${s.store.email}`} className="flex items-center gap-3"><Icon name="mail" className="h-5 w-5 text-gold-600" />{s.store.email}</a></li>}
          <li className="flex items-center gap-3"><Icon name="map" className="h-5 w-5 text-gold-600" />{t.locale === "ar" ? s.store.addressAr : s.store.addressEn}</li>
        </ul>
      </div>
      <div className="card p-6 md:p-10"><ContactForm /></div>
    </div>
  );
}
