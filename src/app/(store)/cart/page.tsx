import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { CartView } from "@/components/store/CartView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("سلة التسوق", "Shopping bag"), robots: { index: false } };
}

export default async function CartPage() {
  return <CartView />;
}
