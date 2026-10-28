import { getResourceArticle, listResourceSlugs } from "@/lib/marketing/resources";
import { SHARE_SIZE, shareImage } from "@/lib/seo/share-image";

export const alt = "KOB guide for restaurant owners";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return listResourceSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return shareImage(getResourceArticle(slug)?.title ?? "Guides for restaurant owners", "A KOB guide for restaurant owners");
}
