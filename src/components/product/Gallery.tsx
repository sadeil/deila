"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";

type Img = { url: string; alt: string };

function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return null;
}

export function Gallery({ images, videoUrl, isIllustration }: { images: Img[]; videoUrl?: string | null; isIllustration?: boolean }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [video, setVideo] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const embed = videoUrl ? embedUrl(videoUrl) : null;
  const current = images[i];

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (idx !== i) setI(idx);
  };

  if (!images.length) return <div className="aspect-[4/5] rounded-3xl bg-ivory-100" />;

  return (
    <div className="lg:grid lg:grid-cols-[88px_1fr] lg:gap-5">
      {/* Thumbnails (desktop) */}
      <div className="order-first hidden flex-col gap-3 lg:flex">
        {images.map((img, k) => (
          <button key={img.url + k} onClick={() => { setI(k); setVideo(false); }} aria-label={`${t("صورة", "Image")} ${k + 1}`} aria-current={k === i && !video}
            className={cn("relative aspect-[4/5] overflow-hidden rounded-xl bg-ivory-100 ring-offset-2 ring-offset-ivory transition", k === i && !video ? "ring-1 ring-plum" : "opacity-70 hover:opacity-100")}>
            <Image src={img.url} alt="" fill sizes="88px" className="object-cover" />
          </button>
        ))}
        {embed && (
          <button onClick={() => setVideo(true)} className={cn("grid aspect-[4/5] place-items-center rounded-xl bg-plum text-ivory", video && "ring-1 ring-plum ring-offset-2")} aria-label={t("فيديو المنتج", "Product video")}>
            <Icon name="play" className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Main (desktop): hover zoom */}
      <div className="relative hidden lg:block">
        {video && embed ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-plum">
            <iframe src={embed} title={t("فيديو المنتج", "Product video")} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <div
            className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-3xl bg-ivory-100"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom(null)}
            onClick={() => setLightbox(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div key={current.url} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <Image src={current.url} alt={current.alt} fill priority sizes="(min-width:1024px) 45vw, 100vw"
                  className="object-cover transition-transform duration-300 ease-out"
                  style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
              </motion.div>
            </AnimatePresence>
            <span className="pointer-events-none absolute bottom-4 end-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs backdrop-blur">
              <Icon name="zoom" className="h-3.5 w-3.5" />{t("تكبير", "Zoom")}
            </span>
          </div>
        )}
      </div>

      {/* Mobile: swipeable track */}
      <div className="relative -mx-4 lg:hidden">
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {images.map((img, k) => (
            <button key={img.url + k} onClick={() => { setI(k); setLightbox(true); }} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-ivory-100" aria-label={t("تكبير الصورة", "Enlarge image")}>
              <Image src={img.url} alt={img.alt} fill priority={k === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {images.map((_, k) => <span key={k} className={cn("h-1.5 rounded-full bg-plum transition-all", k === i ? "w-6" : "w-1.5 opacity-30")} />)}
          </div>
        )}
        {embed && <a href={videoUrl!} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm absolute end-4 top-4 bg-white/90"><Icon name="play" className="h-3.5 w-3.5" />{t("فيديو", "Video")}</a>}
      </div>

      {isIllustration && (
        <p className="mt-3 text-xs text-plum-500 lg:col-start-2">{t("رسم توضيحي — ستُضاف صور المنتج الفعلية بعد التحقق.", "Illustration — actual product photos will be added after verification.")}</p>
      )}

      <Sheet open={lightbox} onClose={() => setLightbox(false)} side="center" label={t("معرض الصور", "Image gallery")} className="max-w-3xl bg-ivory-100">
        <button onClick={() => setLightbox(false)} className="absolute end-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white" aria-label={t("إغلاق", "Close")}><Icon name="close" /></button>
        <div className="relative aspect-[4/5] max-h-[85dvh] w-full">
          <Image src={current.url} alt={current.alt} fill sizes="90vw" className="object-contain" />
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            <button onClick={() => setI((i - 1 + images.length) % images.length)} className="grid h-10 w-10 place-items-center rounded-full bg-white" aria-label={t("السابق", "Previous")}><Icon name="chevron" className="h-4 w-4 rotate-180 flip-rtl" /></button>
            <button onClick={() => setI((i + 1) % images.length)} className="grid h-10 w-10 place-items-center rounded-full bg-white" aria-label={t("التالي", "Next")}><Icon name="chevron" className="h-4 w-4 flip-rtl" /></button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
