"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Quote } from "@/lib/services/pricing";

export type CartSnapshot = {
  slug: string;
  nameAr: string;
  nameEn: string;
  variantNameAr?: string | null;
  variantNameEn?: string | null;
  image?: string | null;
  unitPrice: number; // display hint only — the server always reprices
};
export type CartLine = { variantId: string; quantity: number; snap: CartSnapshot };

type Ctx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (variantId: string, quantity: number, snap: CartSnapshot) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  coupon: string | null;
  setCoupon: (c: string | null) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  lastAdded: { variantId: string; at: number } | null;
  quote: Quote | null;
  quoting: boolean;
  quoteError: boolean;
  refreshQuote: (opts?: { localityId?: string | null; phone?: string | null }) => Promise<Quote | null>;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "della_cart_v1";
const MAX_QTY = 10;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCouponState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<Ctx["lastAdded"]>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { lines?: CartLine[]; coupon?: string | null };
        if (Array.isArray(parsed.lines)) setLines(parsed.lines.filter((l) => l.variantId && l.quantity > 0).slice(0, 30));
        if (parsed.coupon) setCouponState(parsed.coupon);
      }
    } catch { /* storage unavailable */ }
    setReady(true);
    // keep tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try { setLines(JSON.parse(e.newValue).lines ?? []); } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ lines, coupon })); } catch {}
  }, [lines, coupon, ready]);

  const add: Ctx["add"] = useCallback((variantId, quantity, snap) => {
    setLines((prev) => {
      const ex = prev.find((l) => l.variantId === variantId);
      if (ex) return prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity), snap } : l));
      return [...prev, { variantId, quantity: Math.min(MAX_QTY, quantity), snap }].slice(-30);
    });
    setLastAdded({ variantId, at: Date.now() });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((variantId: string, quantity: number) => {
    const q = Math.max(1, Math.min(MAX_QTY, Math.floor(quantity) || 1));
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)));
  }, []);
  const remove = useCallback((variantId: string) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => { setLines([]); setCouponState(null); setQuote(null); }, []);
  const setCoupon = useCallback((c: string | null) => setCouponState(c ? c.trim().toUpperCase() : null), []);

  const refreshQuote: Ctx["refreshQuote"] = useCallback(async (opts) => {
    const id = ++reqId.current;
    if (!lines.length) { setQuote(null); return null; }
    setQuoting(true);
    setQuoteError(false);
    try {
      const res = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          couponCode: coupon,
          localityId: opts?.localityId ?? null,
          phone: opts?.phone ?? null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const q = (await res.json()) as Quote;
      if (id === reqId.current) setQuote(q);
      return q;
    } catch {
      if (id === reqId.current) setQuoteError(true);
      return null;
    } finally {
      if (id === reqId.current) setQuoting(false);
    }
  }, [lines, coupon]);

  // Requote whenever the cart changes while the drawer is visible.
  useEffect(() => {
    if (!ready || !drawerOpen) return;
    const t = setTimeout(() => void refreshQuote(), 150);
    return () => clearTimeout(t);
  }, [ready, drawerOpen, refreshQuote]);

  const value = useMemo<Ctx>(() => ({
    lines, count: lines.reduce((s, l) => s + l.quantity, 0), ready,
    add, setQty, remove, clear, coupon, setCoupon,
    drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    lastAdded, quote, quoting, quoteError, refreshQuote,
  }), [lines, ready, add, setQty, remove, clear, coupon, setCoupon, drawerOpen, lastAdded, quote, quoting, quoteError, refreshQuote]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
