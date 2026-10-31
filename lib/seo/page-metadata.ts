import type { Metadata } from "next";

/**
 * The public origin search engines should index. Previews and local dev still canonicalise to production, so a
 * deploy preview never competes with trykob.com.
 */
export function canonicalOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NETLIFY_PRODUCTION_URL?.trim();
  if (env && env.startsWith("https://") && !/localhost|127\.0\.0\.1|netlify\.app/.test(env)) return env.replace(/\/$/, "");
  return "https://trykob.com";
}

export const canonicalUrl = (path: string) => `${canonicalOrigin()}${path === "/" ? "" : path}`;

export const SITE_NAME = "KOB";

/**
 * The site-wide share card (app/opengraph-image.tsx). Named here because a page that sets openGraph replaces the
 * parent's images. Pages with their own opengraph-image file (the guides) pass ownShareImage, since an explicit image
 * here would win over the file.
 */
const DEFAULT_SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "KOB: every review answered, every listing right. You approve and post in one tap.",
};

/**
 * Title, description, canonical and share tags for one public page. Setting openGraph here replaces the layout's
 * (Next.js doesn't merge it), so each page gets its own share title.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  /** Use the title as written, without the " | KOB" suffix. */
  absolute?: boolean;
  noindex?: boolean;
  type?: "website" | "article";
  /** The route has its own opengraph-image file. */
  ownShareImage?: boolean;
}): Metadata {
  const images = opts.ownShareImage ? {} : { images: [DEFAULT_SHARE_IMAGE] };
  const url = canonicalUrl(opts.path);
  const fullTitle = opts.absolute ? opts.title : `${opts.title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: opts.type ?? "website",
      locale: "en_GB",
      siteName: SITE_NAME,
      title: fullTitle,
      description: opts.description,
      url,
      ...images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: opts.description, ...images },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
