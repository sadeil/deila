import { getT } from "@/lib/i18n";
import { WishlistView } from "@/components/store/WishlistView";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("المفضلة", "Wishlist"), robots: { index: false } };
}

export default function WishlistPage() {
  return <WishlistView />;
}
