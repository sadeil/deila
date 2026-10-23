"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setLocale } from "@/app/actions/locale";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Wordmark } from "../brand/Wordmark";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";

type Cat = { slug: string; nameAr: string; nameEn: string; image: string | null };

export function Header({ categories, signedIn }: { categories: Cat[]; signedIn: boolean }) {
  const t = useT();
  const l = t.locale;
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const wish = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mega, setMega] = useState(false);
  const [search, setSearch] = useState(false);
  const [pending, start] = useTransition();
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > 320 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setMenu(false); setMega(false); setSearch(false); }, [pathname]);

  const switchLang = () => start(async () => { await setLocale(l === "ar" ? "en" : "ar"); router.refresh(); });

  const nav = [
    { href: "/shop?sort=new", label: t("وصل حديثاً", "New arrivals") },
    { href: "/shop?sort=popular", label: t("الأكثر طلباً", "Best sellers") },
    { href: "/about", label: t("عن ديلا", "About DELLA") },
    { href: "/contact", label: t("تواصلي معنا", "Contact") },
  ];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-lux",
          scrolled ? "bg-ivory/90 shadow-[0_1px_0_rgba(36,26,38,.06)] backdrop-blur-md" : "bg-ivory",
          hidden && !mega && "-translate-y-full",
        )}
        onMouseLeave={() => setMega(false)}
      >
        <div className="container flex h-[var(--header-h)] items-center gap-4">
          <button className="-ms-2 grid h-11 w-11 place-items-center lg:hidden" onClick={() => setMenu(true)} aria-label={t("القائمة", "Menu")}>
            <Icon name="menu" />
          </button>

          <Link href="/" className="shrink-0 lg:me-6" aria-label="DELLA — home">
            <Wordmark className="h-[22px] md:h-6" />
          </Link>

          <nav className="hidden flex-1 items-center gap-7 text-[13.5px] font-medium lg:flex" aria-label={t("التنقل الرئيسي", "Main navigation")}>
            <button className={cn("flex items-center gap-1 py-6 link-underline", mega && "after:scale-x-100")} onMouseEnter={() => setMega(true)} onClick={() => setMega((m) => !m)} aria-expanded={mega}>
              {t("تسوّقي", "Shop")} <Icon name="chevronDown" className={cn("h-3.5 w-3.5 transition", mega && "rotate-180")} />
            </button>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="py-6 link-underline" onMouseEnter={() => setMega(false)}>{n.label}</Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-0.5">
            <button onClick={() => setSearch(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-plum/5" aria-label={t("بحث", "Search")}>
              <Icon name="search" />
            </button>
            <button onClick={switchLang} disabled={pending} className="hidden h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium hover:bg-plum/5 sm:flex" aria-label={t("Switch to English", "التبديل إلى العربية")}>
              <Icon name="globe" className="h-[18px] w-[18px]" />{l === "ar" ? "EN" : "عربي"}
            </button>
            <Link href={signedIn ? "/account" : "/account/login"} className="hidden h-11 w-11 place-items-center rounded-full hover:bg-plum/5 sm:grid" aria-label={t("حسابي", "My account")}>
              <Icon name="user" />
            </Link>
            <Link href="/wishlist" className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-plum/5" aria-label={t(`المفضلة (${wish.count})`, `Wishlist (${wish.count})`)}>
              <Icon name="heart" />
              {wish.count > 0 && <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />}
            </Link>
            <button onClick={cart.openDrawer} className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-plum/5" aria-label={t(`السلة (${cart.count})`, `Bag (${cart.count})`)}>
              <Icon name="bag" />
              <AnimatePresence>
                {cart.count > 0 && (
                  <motion.span key={cart.count} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="absolute end-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-plum px-1 text-[10px] font-bold text-ivory tabular-nums">
                    {cart.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mega && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 0.8, 0.24, 1] }}
              className="absolute inset-x-0 top-full hidden border-t border-ivory-200 bg-ivory shadow-lift lg:block">
              <div className="container grid grid-cols-[1fr_2fr] gap-12 py-10">
                <div className="space-y-4">
                  <p className="eyebrow">{t("الفئات", "Categories")}</p>
                  <ul className="space-y-2.5">
                    {categories.map((c) => (
                      <li key={c.slug}><Link href={`/shop?category=${c.slug}`} className="display text-xl link-underline">{l === "ar" ? c.nameAr : c.nameEn}</Link></li>
                    ))}
                  </ul>
                  <Link href="/shop" className="inline-flex items-center gap-2 pt-2 text-sm font-semibold link-underline">{t("كل المنتجات", "Shop all")} <Icon name="arrow" className="h-4 w-4 flip-rtl" /></Link>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {categories.slice(0, 3).map((c) => (
                    <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-blush-50">
                        {c.image && <Image src={c.image} alt="" fill sizes="20vw" className="object-cover transition duration-700 group-hover:scale-105" />}
                      </div>
                      <p className="mt-3 text-sm font-medium">{l === "ar" ? c.nameAr : c.nameEn}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu */}
      <Sheet open={menu} onClose={() => setMenu(false)} side="start" label={t("القائمة", "Menu")} className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <Wordmark className="h-5" />
          <button onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center" aria-label={t("إغلاق", "Close")}><Icon name="close" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-6 pb-6">
          <p className="eyebrow mb-3 mt-2">{t("تسوّقي حسب الفئة", "Shop by category")}</p>
          <ul className="divide-y divide-ivory-200 border-y border-ivory-200">
            <li><Link href="/shop" className="flex items-center justify-between py-4 display text-xl">{t("كل المنتجات", "Shop all")}<Icon name="chevron" className="h-4 w-4 flip-rtl" /></Link></li>
            {categories.map((c) => (
              <li key={c.slug}><Link href={`/shop?category=${c.slug}`} className="flex items-center justify-between py-4 display text-xl">{l === "ar" ? c.nameAr : c.nameEn}<Icon name="chevron" className="h-4 w-4 flip-rtl" /></Link></li>
            ))}
          </ul>
          <ul className="mt-6 space-y-4 text-[15px]">
            {nav.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
            <li><Link href={signedIn ? "/account" : "/account/login"}>{t("حسابي", "My account")}</Link></li>
            <li><Link href="/track">{t("تتبع طلبك", "Track your order")}</Link></li>
          </ul>
        </nav>
        <div className="border-t border-ivory-200 p-6">
          <button onClick={switchLang} className="btn-secondary w-full"><Icon name="globe" className="h-4 w-4" />{l === "ar" ? "English" : "العربية"}</button>
        </div>
      </Sheet>

      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  );
}

type Suggestion = { slug: string; nameAr: string; nameEn: string; image: string | null; price: number };

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const l = t.locale;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setItems([]); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setItems((await res.json()).items);
      } catch {}
      setLoading(false);
    }, 180);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  return (
    <Sheet open={open} onClose={onClose} side="top" label={t("بحث", "Search")}>
      <form className="flex items-center gap-3 border-b border-ivory-200 px-6 py-4" role="search"
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) { router.push(`/shop?q=${encodeURIComponent(q.trim())}`); onClose(); } }}>
        <Icon name="search" className="text-plum-500" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحثي عن منتج…", "Search products…")}
          className="h-12 flex-1 bg-transparent text-lg outline-none placeholder:text-plum-400" aria-label={t("بحث", "Search")} />
        <button type="button" onClick={onClose} className="text-sm text-plum-500">{t("إغلاق", "Close")}</button>
      </form>
      <div className="max-h-[60dvh] overflow-y-auto p-3">
        {loading && q.trim().length >= 2 && items.length === 0 && <p className="p-4 text-sm text-plum-500">{t("جارٍ البحث…", "Searching…")}</p>}
        {!loading && q.trim().length >= 2 && items.length === 0 && <p className="p-4 text-sm text-plum-500">{t("لا توجد نتائج مطابقة.", "No matching products.")}</p>}
        <ul>
          {items.map((it) => (
            <li key={it.slug}>
              <Link href={`/product/${it.slug}`} onClick={onClose} className="flex items-center gap-4 rounded-xl p-3 hover:bg-blush-50">
                <span className="relative h-14 w-12 overflow-hidden rounded-lg bg-ivory-100">{it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                <span className="flex-1 text-sm font-medium">{l === "ar" ? it.nameAr : it.nameEn}</span>
                <span className="text-sm tabular-nums text-plum-600">{formatMoney(it.price, l)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
