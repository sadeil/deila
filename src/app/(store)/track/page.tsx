import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { TrackForm } from "@/components/store/TrackForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("تتبع طلبك", "Track your order") };
}

export default async function TrackPage() {
  const t = await getT();
  return (
    <div className="container flex max-w-lg flex-col items-center pb-24 pt-14 text-center md:pt-20">
      <p className="eyebrow">{t("طلباتي", "My orders")}</p>
      <h1 className="display mt-3 text-display-md">{t("تتبع طلبك", "Track your order")}</h1>
      <p className="mt-3 text-plum-600">{t("أدخلي رقم الطلب ورقم الجوال المستخدم عند الطلب.", "Enter your order number and the mobile number used at checkout.")}</p>
      <TrackForm />
    </div>
  );
}
