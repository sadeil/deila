import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ContentPageView } from "@/components/store/ContentPageView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("عن ديلا", "About DELLA"), alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const [page, t] = await Promise.all([db.contentPage.findUnique({ where: { slug: "about" } }), getT()]);
  if (!page) notFound();
  const ar = t.locale === "ar";
  return (
    <ContentPageView
      eyebrow={t("حكايتنا", "Our story")}
      title={ar ? page.titleAr : page.titleEn}
      body={ar ? page.bodyAr : page.bodyEn}
      aside={
        <div className="mt-14 grid items-center gap-8 rounded-3xl bg-blush-50 p-8 sm:grid-cols-[160px_1fr]">
          <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full bg-blush"><Image src="/brand/illustrations/diffuser.svg" alt="" fill sizes="160px" className="object-cover" /></div>
          <div>
            <p className="display text-2xl">{t("أجهزة صُنعت لكِ.", "Gadgets Made for Her.")}</p>
            <Link href="/shop" className="btn-primary mt-5">{t("اكتشفي المجموعة", "Discover the collection")}</Link>
          </div>
        </div>
      }
    />
  );
}
