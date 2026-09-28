import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { TemplateDetailClient } from "./TemplateDetailClient";

export async function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) return {};
  return {
    title: t.seoTitle,
    description: t.seoDescription,
    openGraph: { title: t.seoTitle, description: t.seoDescription },
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();
  return <TemplateDetailClient template={template} />;
}
