"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Accessible overlay: side sheet ("start"/"end") or centred modal. Esc closes, focus is trapped and restored. */
export function Sheet({ open, onClose, side = "end", label, className, children }: {
  open: boolean; onClose: () => void; side?: "start" | "end" | "center" | "bottom" | "top"; label: string; className?: string; children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
    setTimeout(() => (focusables()?.[0] ?? panel.current)?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = focusables();
        if (!f?.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); restore.current?.focus?.(); };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  const rtl = document.documentElement.dir === "rtl";
  const fromX = side === "end" ? (rtl ? "-100%" : "100%") : side === "start" ? (rtl ? "100%" : "-100%") : 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div className="absolute inset-0 bg-plum/40 backdrop-blur-[2px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3 }} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
            className={cn(
              "absolute bg-ivory shadow-lift outline-none",
              side === "end" && "inset-y-0 end-0 w-full max-w-md",
              side === "start" && "inset-y-0 start-0 w-[88%] max-w-sm",
              side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl",
              side === "top" && "inset-x-4 top-20 mx-auto max-w-2xl overflow-hidden rounded-3xl",
              side === "center" && "inset-x-4 top-1/2 mx-auto max-h-[90dvh] max-w-4xl -translate-y-1/2 overflow-auto rounded-3xl",
              className,
            )}
            initial={reduce ? { opacity: 0 } : side === "top" ? { opacity: 0, y: -16 } : side === "center" ? { opacity: 0, scale: 0.97, y: "-48%" } : side === "bottom" ? { y: "100%" } : { x: fromX }}
            animate={side === "top" ? { opacity: 1, y: 0 } : side === "center" ? { opacity: 1, scale: 1, y: "-50%" } : side === "bottom" ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : side === "top" ? { opacity: 0, y: -16 } : side === "center" ? { opacity: 0, scale: 0.98, y: "-48%" } : side === "bottom" ? { y: "100%" } : { x: fromX }}
            transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 0.8, 0.24, 1] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
