import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicTemplate, getPublicTemplates } from "@/lib/public-api";
import { TemplateDetailClient } from "./TemplateDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getPublicTemplate(slug);
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
  const [template, allTemplates] = await Promise.all([
    getPublicTemplate(slug),
    getPublicTemplates(),
  ]);
  if (!template) notFound();

  // Related: same category, excluding current, up to 3
  const related = allTemplates
    .filter((t) => t.slug !== slug && t.category === template.category)
    .slice(0, 3);

  // If not enough in category, pad with others
  const padded =
    related.length >= 3
      ? related
      : [
          ...related,
          ...allTemplates
            .filter((t) => t.slug !== slug && t.category !== template.category)
            .slice(0, 3 - related.length),
        ];

  return <TemplateDetailClient template={template} related={padded} />;
}
