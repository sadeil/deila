"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/money";
import { Icon } from "../ui/Icon";

export type HeroProps = {
  eyebrow: string;
  headline: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  image: string;
  featured: { slug: string; name: string; price: number; category: string } | null;
};

const ease = [0.22, 0.8, 0.24, 1] as const;

export function Hero({ eyebrow, headline, body, primary, secondary, image, featured }: HeroProps) {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const ringY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const words = headline.split(" ");

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -end-40 -top-40 h-[520px] w-[520px] rounded-full bg-blush/40 blur-3xl" aria-hidden />
      <div className="container relative grid items-center gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div className="relative z-10 max-w-2xl">
          <motion.p className="eyebrow mb-6 flex items-center gap-3" initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <span className="h-px w-10 bg-gold" />{eyebrow}
          </motion.p>
          <h1 className="display text-display-xl">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span className="inline-block" initial={reduce ? false : { y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.15 + i * 0.09, ease }}>
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="mt-7 max-w-md text-[17px] leading-relaxed text-plum-600"
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease }}>
            {body}
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease }}>
            <Link href={primary.href} className="btn-primary h-[52px] px-8">{primary.label}<Icon name="arrow" className="h-4 w-4 flip-rtl" /></Link>
            <Link href={secondary.href} className="btn-secondary h-[52px] px-8">{secondary.label}</Link>
          </motion.div>
          <motion.ul className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-plum-600" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1 }}>
            <li className="flex items-center gap-2"><Icon name="shield" className="h-[18px] w-[18px] text-gold-600" />{t("ضمان من الشريك التجاري", "Partner-backed warranty")}</li>
            <li className="flex items-center gap-2"><Icon name="cash" className="h-[18px] w-[18px] text-gold-600" />{t("الدفع عند الاستلام", "Pay on delivery")}</li>
            <li className="flex items-center gap-2"><Icon name="truck" className="h-[18px] w-[18px] text-gold-600" />{t("توصيل لباب البيت", "Delivered to your door")}</li>
          </motion.ul>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <motion.div style={{ y: ringY }} className="absolute -start-6 top-10 h-40 w-40 rounded-full border border-gold/60 md:-start-12 md:h-56 md:w-56" aria-hidden />
          <motion.div
            className="relative aspect-[4/5] overflow-hidden rounded-arch bg-blush"
            initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0% round 999px 999px 24px 24px)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0% round 999px 999px 24px 24px)" }}
            transition={{ duration: 1.4, delay: 0.2, ease }}
          >
            <motion.div style={{ y: imgY }} className="absolute inset-0 scale-110">
              <Image src={image} alt="" fill priority sizes="(min-width:1024px) 520px, 90vw" className="object-cover" />
            </motion.div>
          </motion.div>
          {featured && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.1, ease }}
              className="absolute -bottom-6 end-4 w-60 md:-end-6">
              <Link href={`/product/${featured.slug}`} className="group flex items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-lift backdrop-blur transition hover:-translate-y-0.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-plum text-gold"><Icon name="sparkle" className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] uppercase tracking-[.14em] text-plum-500">{featured.category}</span>
                  <span className="block truncate text-sm font-semibold">{featured.name}</span>
                  <span className="block text-xs tabular-nums text-plum-600">{formatMoney(featured.price, t.locale)}</span>
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
