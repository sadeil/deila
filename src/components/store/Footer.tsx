import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { Wordmark } from "../brand/Wordmark";
import { Icon, type IconName } from "../ui/Icon";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer({ categories }: { categories: { slug: string; nameAr: string; nameEn: string }[] }) {
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const l = t.locale;
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp.replace(/\D/g, "").replace(/^0/, "970")}` : "";
  const socials = ([
    ["instagram", s.social.instagram],
    ["facebook", s.social.facebook],
    ["tiktok", s.social.tiktok],
    ["whatsapp", s.social.whatsapp || wa],
  ] as [IconName, string][]).filter(([, url]) => url);

  return (
    <footer className="bg-plum text-ivory">
      <div className="container grid gap-14 py-16 md:py-20 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-6">
          <Wordmark tone="light" className="h-8" />
          <p className="display text-2xl text-blush">{l === "ar" ? s.store.taglineAr : s.store.taglineEn}</p>
          <p className="max-w-sm text-sm leading-relaxed text-ivory/70">{l === "ar" ? s.footer.aboutAr : s.footer.aboutEn}</p>
          <NewsletterForm tone="dark" />
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <p className="eyebrow !text-gold">{t("تسوّقي", "Shop")}</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/80">
              {categories.map((c) => (
                <li key={c.slug}><Link className="link-underline" href={`/shop?category=${c.slug}`}>{l === "ar" ? c.nameAr : c.nameEn}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-gold">{t("المساعدة", "Help")}</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/80">
              <li><Link className="link-underline" href="/track">{t("تتبع طلبك", "Track your order")}</Link></li>
              <li><Link className="link-underline" href="/pages/delivery">{t("التوصيل", "Delivery")}</Link></li>
              <li><Link className="link-underline" href="/pages/returns">{t("الاسترجاع", "Returns")}</Link></li>
              <li><Link className="link-underline" href="/pages/warranty">{t("الضمان", "Warranty")}</Link></li>
              <li><Link className="link-underline" href="/contact">{t("تواصلي معنا", "Contact us")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-gold">DELLA</p>
            <ul className="mt-5 space-y-3 text-sm text-ivory/80">
              <li><Link className="link-underline" href="/about">{t("عن ديلا", "About")}</Link></li>
              <li><Link className="link-underline" href="/pages/privacy">{t("الخصوصية", "Privacy")}</Link></li>
              <li><Link className="link-underline" href="/pages/terms">{t("الشروط", "Terms")}</Link></li>
              {s.store.email && <li><a className="link-underline" href={`mailto:${s.store.email}`} dir="ltr">{s.store.email}</a></li>}
              {s.store.phone && <li><a className="link-underline" href={`tel:${s.store.phone}`} dir="ltr">{s.store.phone}</a></li>}
            </ul>
            {socials.length > 0 && (
              <div className="mt-6 flex gap-2">
                {socials.map(([icon, url]) => (
                  <a key={icon} href={url} target="_blank" rel="noopener noreferrer" aria-label={icon}
                    className="grid h-10 w-10 place-items-center rounded-full border border-ivory/20 transition hover:bg-ivory hover:text-plum">
                    <Icon name={icon} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-ivory/50 sm:flex-row">
          <p>© {new Date().getFullYear()} DELLA · {l === "ar" ? s.store.addressAr : s.store.addressEn}</p>
          {s.payments.codEnabled && <p className="flex items-center gap-2"><Icon name="cash" className="h-4 w-4" />{t("الدفع عند الاستلام متاح", "Cash on delivery available")}</p>}
        </div>
      </div>
    </footer>
  );
}
