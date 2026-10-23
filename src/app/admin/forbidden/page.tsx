import Link from "next/link";
import { getT } from "@/lib/i18n";

export default async function Forbidden() {
  const t = await getT();
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory p-6 text-center">
      <div>
        <p className="display text-6xl text-blush-300">403</p>
        <h1 className="display mt-3 text-2xl">{t("لا تملك صلاحية الوصول", "You don't have access")}</h1>
        <p className="mt-2 text-sm text-plum-500">{t("اطلب من المدير العام منحك الصلاحية المناسبة.", "Ask a Super Admin to grant the required permission.")}</p>
        <Link href="/admin" className="btn-primary mt-6">{t("العودة للوحة", "Back to dashboard")}</Link>
      </div>
    </div>
  );
}
