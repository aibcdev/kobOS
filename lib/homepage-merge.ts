import type { SanityImageSource } from "@sanity/image-url";

import {
  DEFAULT_HERO_IMAGE,
  defaultSiteMeta,
  homepageBandCopy,
  homepageDefaults,
  homepageQuotesExtra,
  suiteFourthPillar,
} from "@/lib/homepage-defaults";
import type {
  HomepageQueryCaseStudy,
  HomepageQueryResult,
  HomepageQueryTestimonial,
  SanityImageField,
} from "@/lib/sanity/homepage-query";
import { urlFor } from "@/sanity/lib/image";

type PlatformFeatureRow = {
  title: string;
  copy: string;
};

function sanityImageUrl(source: SanityImageField | undefined, fallback: string): string {
  if (!source?.asset) return fallback;
  try {
    return urlFor(source as SanityImageSource).width(1600).quality(85).fit("max").auto("format").url();
  } catch {
    return fallback;
  }
}

function pickFeatures(raw: HomepageQueryResult): readonly PlatformFeatureRow[] {
  const rows = raw?.features?.filter((f) => f?.title && f?.copy).map((f) => ({
    title: String(f.title),
    copy: String(f.copy),
  }));
  if (!rows?.length || rows.length < 3) {
    return homepageDefaults.platformFeatures.map((item) => ({ ...item }));
  }
  return rows.slice(0, 3).map((item) => ({ ...item }));
}

export type CaseStudyRow = {
  name: string;
  type: string;
  result: string;
  metricLabel: string;
  imageUrl: string;
  imageAlt: string;
};

function mapCaseStudies(raw: HomepageQueryCaseStudy[] | null | undefined): CaseStudyRow[] {
  const list =
    raw
      ?.filter((item): item is NonNullable<typeof item> => Boolean(item?.restaurantName && item?.result))
      .map((item) => ({
        name: String(item.restaurantName),
        type: String(item.restaurantType ?? ""),
        result: String(item.result),
        metricLabel: item.summary?.trim()
          ? String(item.summary).trim().slice(0, 72)
          : "Outcome reported",
        imageUrl: sanityImageUrl(
          item.image ?? null,
          homepageDefaults.caseStudies[0]?.imageUrl ?? DEFAULT_HERO_IMAGE,
        ),
        imageAlt: item.image?.alt?.trim() || `${item.restaurantName} case study`,
      })) ?? [];
  if (!list.length) return homepageDefaults.caseStudies.map((row) => ({ ...row }));
  return list;
}

export type CarouselStory = {
  name: string;
  metric: string;
  metricLabel: string;
  role: string;
  imageUrl: string;
  imageAlt: string;
};

function buildCarouselStories(caseStudies: CaseStudyRow[]): CarouselStory[] {
  return caseStudies.map((cs) => ({
    name: cs.name,
    metric: cs.result,
    metricLabel: cs.metricLabel,
    role: cs.type,
    imageUrl: cs.imageUrl,
    imageAlt: cs.imageAlt,
  }));
}

function testimonialFallback() {
  const d = homepageDefaults.testimonial;
  return { quote: String(d.quote), name: String(d.name), role: String(d.role) };
}

function pickTestimonial(rawT: HomepageQueryTestimonial[] | null | undefined) {
  const t = rawT?.find((x) => x?.quote?.trim());
  if (!t?.quote?.trim()) return testimonialFallback();
  return {
    quote: String(t.quote),
    name: String(t.name ?? ""),
    role: String(t.role ?? ""),
  };
}

/** Merge Sanity homepage document with defaults. Safe when `doc` is null or partial. */
export function mergeHomepageContent(doc: HomepageQueryResult) {
  const h = doc?.hero;
  const caseStudies = mapCaseStudies(doc?.caseStudies ?? null);
  const carouselStories = buildCarouselStories(caseStudies);
  const platformFeatures = pickFeatures(doc);
  const allFeatureRows =
    doc?.features
      ?.filter((f) => f?.title && f?.copy)
      .map((f) => ({ title: String(f.title), copy: String(f.copy) })) ?? [];
  const restForTiles = allFeatureRows.slice(3, 7);
  const defaultTiles = homepageDefaults.contentBand.tiles;
  const mergedTiles =
    restForTiles.length >= 4
      ? restForTiles.map((f) => ({
          title: f.title,
          copy: f.copy,
          imageUrl: homepageDefaults.contentBand.fallbackTileImageUrl,
          imageAlt: `${f.title} illustration`,
        }))
      : defaultTiles.map((t) => ({ ...t }));

  const logosFromSanity =
    doc?.trustItems?.filter((s): s is string => typeof s === "string" && s.trim().length > 0) ?? [];

  const fourthFromCms = allFeatureRows[3];
  const suiteCards = [
    ...platformFeatures.map((row) => ({ ...row })),
    fourthFromCms
      ? { title: String(fourthFromCms.title), copy: String(fourthFromCms.copy) }
      : { title: suiteFourthPillar.title, copy: suiteFourthPillar.copy },
  ];

  const mainQuote = pickTestimonial(doc?.testimonials ?? null);
  const quotesForHome = [
    { quote: mainQuote.quote, name: mainQuote.name, role: mainQuote.role },
    ...homepageQuotesExtra.map((q) => ({ quote: q.quote, name: q.name, role: q.role })),
  ];

  return {
    ...homepageDefaults,
    pageBand: { ...homepageBandCopy },
    suiteCards,
    quotesForHome,
    seoTitle: doc?.seoTitle?.trim() || null,
    seoDescription: doc?.seoDescription?.trim() || null,
    socialProof: {
      label: homepageDefaults.socialProof.label,
      logos: logosFromSanity.length ? logosFromSanity : [...homepageDefaults.socialProof.logos],
    },
    platformFeatures,
    hero: {
      ...homepageDefaults.hero,
      eyebrow: h?.eyebrow?.trim() || homepageDefaults.hero.eyebrow,
      headline: h?.headline?.trim() || homepageDefaults.hero.headline,
      headlineEmphasis:
        h?.headlineEmphasis?.trim() || homepageDefaults.hero.headlineEmphasis,
      subheadline: h?.subheadline?.trim() || homepageDefaults.hero.subheadline,
      primaryCta: h?.primaryCta?.trim() || homepageDefaults.hero.primaryCta,
      primaryCtaUrl: h?.primaryCtaUrl?.trim() || homepageDefaults.hero.primaryCtaUrl,
      secondaryCta: h?.secondaryCta?.trim() || homepageDefaults.hero.secondaryCta,
      secondaryCtaUrl:
        h?.secondaryCtaUrl?.trim() || homepageDefaults.hero.secondaryCtaUrl,
      tertiaryCta: h?.tertiaryCta?.trim() || homepageDefaults.hero.tertiaryCta,
      tertiaryCtaUrl:
        h?.tertiaryCtaUrl?.trim() || homepageDefaults.hero.tertiaryCtaUrl,
      overlayLine1: homepageDefaults.hero.overlayLine1,
      overlayLine2: homepageDefaults.hero.overlayLine2,
      imageAlt: h?.image?.alt?.trim() || homepageDefaults.hero.imageAlt,
      imageUrl: sanityImageUrl(h?.image ?? null, DEFAULT_HERO_IMAGE),
    },
    productStory: {
      ...homepageDefaults.productStory,
      imageUrl: sanityImageUrl(h?.image ?? null, homepageDefaults.productStory.imageUrl),
    },
    contentBand: {
      ...homepageDefaults.contentBand,
      tiles: mergedTiles,
    },
    caseStudies,
    carouselStories,
    testimonial: pickTestimonial(doc?.testimonials ?? null),
    closing: {
      ...homepageDefaults.closing,
      primaryCta: h?.primaryCta?.trim() || homepageDefaults.closing.primaryCta,
      primaryCtaUrl: h?.primaryCtaUrl?.trim() || homepageDefaults.closing.primaryCtaUrl,
      secondaryCta: h?.secondaryCta?.trim() || homepageDefaults.closing.secondaryCta,
      secondaryCtaUrl:
        h?.secondaryCtaUrl?.trim() || homepageDefaults.closing.secondaryCtaUrl,
    },
    nav: { ...homepageDefaults.nav },
    stats: [...homepageDefaults.stats],
    transformBand: { ...homepageDefaults.transformBand },
  };
}

export type HomepageContent = ReturnType<typeof mergeHomepageContent>;

export function metadataFromHomepage(merged: HomepageContent): {
  title: string;
  description: string;
} {
  return {
    title: merged.seoTitle?.trim() || defaultSiteMeta.title,
    description: merged.seoDescription?.trim() || defaultSiteMeta.description,
  };
}
