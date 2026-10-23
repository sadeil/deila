"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { ids: Set<string>; has: (id: string) => boolean; toggle: (id: string) => void; count: number };
const WishCtx = createContext<Ctx | null>(null);
const KEY = "della_wishlist_v1";

/** Guests keep a wishlist in this browser; signed-in customers' wishlist lives in the database. */
export function WishlistProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let local: string[] = [];
    try { local = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
    if (!signedIn) { setIds(new Set(local)); return; }
    (async () => {
      // Merge any guest wishlist into the account once, then use the server copy.
      if (local.length) {
        await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: local }) });
        try { localStorage.removeItem(KEY); } catch {}
      }
      const res = await fetch("/api/wishlist");
      if (res.ok) setIds(new Set(((await res.json()) as { productIds: string[] }).productIds));
    })();
  }, [signedIn]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      const adding = !next.has(id);
      adding ? next.add(id) : next.delete(id);
      if (signedIn) {
        void fetch("/api/wishlist", {
          method: adding ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [id] }),
        });
      } else {
        try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
      }
      return next;
    });
  }, [signedIn]);

  const value = useMemo(() => ({ ids, has: (id: string) => ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const c = useContext(WishCtx);
  if (!c) throw new Error("useWishlist outside WishlistProvider");
  return c;
}
