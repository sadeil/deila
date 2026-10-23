import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ContentPageView } from "@/components/store/ContentPageView";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const [page, t] = await Promise.all([db.contentPage.findUnique({ where: { slug } }), getT()]);
  return page ? { title: t.locale === "ar" ? page.titleAr : page.titleEn, alternates: { canonical: `/pages/${slug}` } } : {};
}

export default async function ContentPage({ params }: P) {
  const { slug } = await params;
  const [page, t] = await Promise.all([db.contentPage.findUnique({ where: { slug: slug.slice(0, 60) } }), getT()]);
  if (!page || !page.published) notFound();
  const ar = t.locale === "ar";
  return <ContentPageView eyebrow={t("معلومات", "Information")} title={ar ? page.titleAr : page.titleEn} body={ar ? page.bodyAr : page.bodyEn} />;
}
