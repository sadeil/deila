"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { adminLogout } from "@/app/admin/actions/auth";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Monogram, Wordmark } from "../brand/Wordmark";
import { Icon, type IconName } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";

export type NavItem = { href: string; icon: IconName; ar: string; en: string; group: "ops" | "catalog" | "business" | "system"; badge?: number };

export function AdminShell({ nav, user, unread, children }: {
  nav: NavItem[]; user: { name: string; roleAr: string; roleEn: string }; unread: number; children: React.ReactNode;
}) {
  const t = useT();
  const l = t.locale;
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("della_admin_sidebar") === "1"); } catch {}
  }, []);
  useEffect(() => setMobile(false), [pathname]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("della_admin_sidebar", c ? "0" : "1"); } catch {} return !c; });

  const groups: [NavItem["group"], string][] = [["ops", t("العمليات", "Operations")], ["catalog", t("الكتالوج", "Catalog")], ["business", t("الأعمال", "Business")], ["system", t("النظام", "System")]];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const NavList = ({ compact }: { compact: boolean }) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label={t("قائمة الإدارة", "Admin navigation")}>
      {groups.map(([g, label]) => {
        const items = nav.filter((n) => n.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-ivory/40">{label}</p>}
            <ul className="space-y-0.5">
              {items.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} title={compact ? (l === "ar" ? n.ar : n.en) : undefined} aria-current={isActive(n.href) ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition", isActive(n.href) ? "bg-ivory text-plum" : "text-ivory/75 hover:bg-ivory/10 hover:text-ivory", compact && "justify-center px-0")}>
                    <Icon name={n.icon} className="h-[18px] w-[18px]" />
                    {!compact && <span className="flex-1">{l === "ar" ? n.ar : n.en}</span>}
                    {!compact && !!n.badge && <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-plum">{n.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-ivory-100/60 lg:flex">
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col bg-plum text-ivory transition-[width] duration-300 lg:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className={cn("flex h-16 items-center border-b border-ivory/10", collapsed ? "justify-center" : "justify-between px-5")}>
          {collapsed ? <Monogram className="h-9 w-9" /> : <Link href="/admin"><Wordmark tone="light" className="h-5" /></Link>}
          {!collapsed && <button onClick={toggle} className="text-ivory/50 hover:text-ivory" aria-label={t("طي القائمة", "Collapse sidebar")}><Icon name="chevron" className="h-4 w-4 rotate-180 flip-rtl" /></button>}
        </div>
        <NavList compact={collapsed} />
        {collapsed && <button onClick={toggle} className="mb-4 self-center text-ivory/50 hover:text-ivory" aria-label={t("توسيع القائمة", "Expand sidebar")}><Icon name="chevron" className="h-4 w-4 flip-rtl" /></button>}
      </aside>

      <Sheet open={mobile} onClose={() => setMobile(false)} side="start" label={t("القائمة", "Menu")} className="flex flex-col bg-plum text-ivory">
        <div className="flex h-16 items-center justify-between border-b border-ivory/10 px-5">
          <Wordmark tone="light" className="h-5" />
          <button onClick={() => setMobile(false)} aria-label={t("إغلاق", "Close")}><Icon name="close" /></button>
        </div>
        <NavList compact={false} />
      </Sheet>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ivory-200 bg-white/85 px-4 backdrop-blur md:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-ivory-100 lg:hidden" onClick={() => setMobile(true)} aria-label={t("القائمة", "Menu")}><Icon name="menu" /></button>
          <form action="/admin/orders" className="relative hidden max-w-sm flex-1 sm:block" role="search">
            <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-plum-400" />
            <input name="q" placeholder={t("ابحث برقم الطلب أو الهاتف أو الاسم…", "Search order #, phone or name…")} className="h-10 w-full rounded-full border border-ivory-200 bg-ivory-100/60 pe-4 ps-9 text-sm focus:border-plum focus:outline-none" />
          </form>
          <div className="ms-auto flex items-center gap-1">
            <Link href="/" target="_blank" className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-ivory-100 md:flex"><Icon name="external" className="h-4 w-4" />{t("المتجر", "Storefront")}</Link>
            <button onClick={() => start(async () => { await setLocale(l === "ar" ? "en" : "ar"); router.refresh(); })} className="h-10 rounded-full px-3 text-xs font-semibold hover:bg-ivory-100">{l === "ar" ? "EN" : "عربي"}</button>
            <Link href="/admin/notifications" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ivory-100" aria-label={t(`الإشعارات (${unread})`, `Notifications (${unread})`)}>
              <Icon name="bell" />
              {unread > 0 && <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
            <div className="ms-2 hidden text-end md:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[11px] text-plum-500">{l === "ar" ? user.roleAr : user.roleEn}</p>
            </div>
            <form action={adminLogout}><button className="grid h-10 w-10 place-items-center rounded-full hover:bg-ivory-100" aria-label={t("تسجيل الخروج", "Sign out")}><Icon name="logout" className="h-[18px] w-[18px] flip-rtl" /></button></form>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
