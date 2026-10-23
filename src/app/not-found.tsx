import Link from "next/link";
import { getT } from "@/lib/i18n";
import { Wordmark } from "@/components/brand/Wordmark";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-6 text-center">
      <div>
        <Link href="/" aria-label="DELLA"><Wordmark className="mx-auto h-7" /></Link>
        <p className="display mt-14 text-[7rem] leading-none text-blush-300">404</p>
        <h1 className="display mt-4 text-display-sm">{t("الصفحة غير موجودة", "Page not found")}</h1>
        <p className="mt-3 text-plum-600">{t("ربما نُقلت الصفحة أو أن الرابط غير صحيح.", "The page may have moved, or the link is incorrect.")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary">{t("الرئيسية", "Home")}</Link>
          <Link href="/shop" className="btn-secondary">{t("تسوّقي", "Shop")}</Link>
        </div>
      </div>
    </div>
  );
}
