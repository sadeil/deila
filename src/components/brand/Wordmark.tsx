import { cn } from "@/lib/utils";

/**
 * DELLA wordmark — original high-contrast letterforms: hairline/heavy stroke contrast,
 * a single continuous baseline joining the double L, and a champagne gem replacing the A's crossbar.
 */
export const WORDMARK_PATHS = {
  letters:
    "M0 6H18C40 6 52 18 52 30S40 54 18 54H0Z M7 7.6H18C35 7.6 45 18 45 30S35 52.4 18 52.4H7Z " +
    "M66 6h7v48h-7z M73 6h27v1.6H73z M98.4 6h1.6v8h-1.6z M73 29.2h21v1.6H73z M73 52.4h29V54H73z M100.4 46h1.6v8h-1.6z " +
    "M116 6h7v48h-7z M156 6h7v48h-7z M123 52.4h67V54h-67z M188.4 46h1.6v8h-1.6z " +
    "M219 6h7l24 48h-7z M219 6h1.8L199.6 54H198z",
  gem: "M220.5 32.5l4.5 5.5-4.5 5.5-4.5-5.5z",
};

export function Wordmark({
  className,
  tone = "dark",
  title = "DELLA",
}: { className?: string; tone?: "dark" | "light"; title?: string }) {
  return (
    <svg
      viewBox="0 0 252 60"
      role="img"
      aria-label={title}
      className={cn("h-6 w-auto", tone === "dark" ? "text-plum" : "text-ivory", className)}
      // The wordmark is Latin and must never mirror in RTL.
      style={{ direction: "ltr" }}
    >
      <path d={WORDMARK_PATHS.letters} fill="currentColor" fillRule="evenodd" />
      <path d={WORDMARK_PATHS.gem} fill="#C49A73" />
    </svg>
  );
}

export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#241A26" />
      <path
        transform="translate(13 9.5) scale(.75)"
        d="M0 6H18C40 6 52 18 52 30S40 54 18 54H0Z M7 7.6H18C35 7.6 45 18 45 30S35 52.4 18 52.4H7Z"
        fill="#F9F3EF"
        fillRule="evenodd"
      />
      <path d="M28 27.5l4 4.5-4 4.5-4-4.5z" fill="#C49A73" />
    </svg>
  );
}
