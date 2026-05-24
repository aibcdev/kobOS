/** GROQ for singleton homepage doc; expand references for case studies & testimonials. */
export const HOMEPAGE_QUERY = `*[_type == "homepage"][0]{
  hero {
    eyebrow,
    headline,
    headlineEmphasis,
    subheadline,
    primaryCta,
    primaryCtaUrl,
    secondaryCta,
    secondaryCtaUrl,
    tertiaryCta,
    tertiaryCtaUrl,
    image{
      ...,
      asset
    }
  },
  trustItems,
  features[]{ title, copy },
  caseStudies[]->{
    restaurantName,
    restaurantType,
    result,
    summary,
    image{
      ...,
      asset
    }
  },
  testimonials[]->{ quote, name, role },
  seoTitle,
  seoDescription
}`;

export type SanityImageField = {
  _type?: "image";
  asset?: unknown;
  alt?: string | null;
} | null;

export type HomepageQueryHero = {
  eyebrow?: string | null;
  headline?: string | null;
  headlineEmphasis?: string | null;
  subheadline?: string | null;
  primaryCta?: string | null;
  primaryCtaUrl?: string | null;
  secondaryCta?: string | null;
  secondaryCtaUrl?: string | null;
  tertiaryCta?: string | null;
  tertiaryCtaUrl?: string | null;
  image?: SanityImageField;
} | null;

export type HomepageQueryCaseStudy = {
  restaurantName?: string | null;
  restaurantType?: string | null;
  result?: string | null;
  /** Optional short line; used as carousel metric label when present. */
  summary?: string | null;
  image?: SanityImageField;
} | null;

export type HomepageQueryTestimonial = {
  quote?: string | null;
  name?: string | null;
  role?: string | null;
} | null;

export type HomepageQueryResult = {
  hero?: HomepageQueryHero;
  trustItems?: (string | null)[] | null;
  features?: { title?: string | null; copy?: string | null }[] | null;
  caseStudies?: HomepageQueryCaseStudy[] | null;
  testimonials?: HomepageQueryTestimonial[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
} | null;
