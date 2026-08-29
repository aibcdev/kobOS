import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ResourceArticleView,
  resourceArticleJsonLd,
} from "@/components/marketing/resources/ResourceArticleView";
import {
  getResourceArticle,
  listResourceSlugs,
  resourceArticleUrl,
} from "@/lib/marketing/resources";
import { getSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) return { title: "Resources | KOB" };
  const canonical = resourceArticleUrl(slug, getSiteUrl());
  return {
    title: `${article.title} | KOB`,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ResourceArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) notFound();
  const canonical = resourceArticleUrl(slug, getSiteUrl());
  const jsonLd = resourceArticleJsonLd(article, canonical);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResourceArticleView article={article} />
    </>
  );
}
