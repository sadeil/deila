"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { useT } from "@/lib/i18n/client";
import { Icon } from "../ui/Icon";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useWishlist } from "./WishlistProvider";

export function WishlistView() {
  const t = useT();
  const wish = useWishlist();
  const [items, setItems] = useState<ProductCardData[] | null>(null);
  const key = [...wish.ids].sort().join(",");

  useEffect(() => {
    if (!key) { setItems([]); return; }
    let live = true;
    fetch(`/api/products/cards?ids=${encodeURIComponent(key)}`).then((r) => r.json()).then((d) => live && setItems(d.items)).catch(() => live && setItems([]));
    return () => { live = false; };
  }, [key]);

  const visible = items?.filter((p) => wish.has(p.id)) ?? null;

  return (
    <div className="container pb-24 pt-10 md:pt-14">
      <h1 className="display text-display-lg">{t("المفضلة", "Wishlist")}</h1>
      {visible === null ? (
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : visible.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl bg-ivory-100 px-6 py-20 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-blush"><Icon name="heart" className="h-8 w-8" /></span>
          <h2 className="display mt-6 text-2xl">{t("لا توجد منتجات في المفضلة", "Your wishlist is empty")}</h2>
          <p className="mt-2 text-sm text-plum-600">{t("اضغطي على القلب لحفظ ما يعجبك.", "Tap the heart to save what you love.")}</p>
          <Link href="/shop" className="btn-primary mt-8">{t("اكتشفي المنتجات", "Discover products")}</Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
          {visible.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}
        </ul>
      )}
    </div>
  );
}
