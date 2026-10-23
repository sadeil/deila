import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CartProvider } from "@/components/store/CartProvider";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { QuickViewProvider } from "@/components/store/QuickView";
import { WishlistProvider } from "@/components/store/WishlistProvider";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, customer, t] = await Promise.all([
    db.category.findMany({
      where: { visible: true, archived: false },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, nameAr: true, nameEn: true, image: true },
    }),
    getCustomer(),
    getT(),
  ]);
  return (
    <CartProvider>
      <WishlistProvider signedIn={!!customer}>
        <QuickViewProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-ivory">
            {t("انتقلي إلى المحتوى", "Skip to content")}
          </a>
          <AnnouncementBar />
          <Header categories={categories} signedIn={!!customer} />
          <main id="main" className="min-h-[60vh]">{children}</main>
          <Footer categories={categories} />
          <CartDrawer />
        </QuickViewProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
