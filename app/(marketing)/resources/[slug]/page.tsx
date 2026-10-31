import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ResourceArticleView,
  resourceArticleJsonLd,
} from "@/components/marketing/resources/ResourceArticleView";
import { articlePath, getResourceArticle, listResourceSlugs } from "@/lib/marketing/resources";
import { canonicalUrl, pageMetadata } from "@/lib/seo/page-metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) return { title: "Guides | KOB" };
  const meta = pageMetadata({ title: article.title, description: article.description, path: articlePath(slug), type: "article", ownShareImage: true });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
  };
}

export default async function ResourceArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) notFound();
  const canonical = canonicalUrl(articlePath(slug));
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
