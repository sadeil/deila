import { cn } from "@/lib/utils";

const P: Record<string, string> = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  bag: "M6 7h12l1 13H5L6 7Zm3 0V6a3 3 0 0 1 6 0v1",
  heart: "M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  menu: "M4 7h16M4 12h16M4 17h10",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "m5 12 5 5L20 7",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  shield: "M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-3 9 2 2 4-4",
  cash: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 10v4m12-4v4",
  chat: "M4 5h16v11H8l-4 4V5Z",
  star: "m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3Z",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4m0-11-6.8 4",
  filter: "M4 6h16M7 12h10M10 18h4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
  zoom: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35M11 8v6m-3-3h6",
  play: "M8 5v14l11-7L8 5Z",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-9.5h.01",
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z",
  tiktok: "M15 3c.5 2.5 2 4 4.5 4.3V11a8 8 0 0 1-4.5-1.4V15a6 6 0 1 1-6-6v3.8A2.3 2.3 0 1 0 11.3 15V3H15Z",
  whatsapp: "M4 20l1.3-4A8 8 0 1 1 8.2 19L4 20Zm5-11c0 3.3 2.7 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9Z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  package: "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 8 8-4M12 11 4 7m8 4v10",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0m1-9a3 3 0 1 0 0-6m2 15h3a6 6 0 0 0-4-5.6",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4h.01",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  layout: "M3 4h18v16H3zM3 9h18M9 9v11",
  coins: "M9 8a6 3 0 1 0 0 .01M3 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8m-12 4v4c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.5M15 13a6 3 0 1 0 6 3v-4",
  handshake: "m3 12 4-4 5 2 5-2 4 4-7 7-2-2-2 2-7-7Zm9-2-3 3",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  doc: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  copy: "M8 8h12v12H8zM4 16V4h12",
  upload: "M12 16V4m-5 5 5-5 5 5M4 20h16",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  print: "M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z",
  download: "M12 4v12m-5-5 5 5 5-5M4 20h16",
  map: "M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  alert: "M12 9v4m0 4h.01M10.3 4 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-12h.01M11 12h1v5h1",
};
export type IconName = keyof typeof P;

export function Icon({ name, className, strokeWidth = 1.5, title }: { name: IconName; className?: string; strokeWidth?: number; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      <path d={P[name]} />
    </svg>
  );
}
