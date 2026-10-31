import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";
import { BRAND } from "@/lib/marketing/brand-facts";
import { canonicalUrl } from "@/lib/seo/page-metadata";

export const ORGANIZATION_ID = `${canonicalUrl("/")}#organization`;
export const SOFTWARE_ID = `${canonicalUrl("/")}#software`;

/** On every marketing page. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: BRAND.productName,
        alternateName: BRAND.listingName,
        url: canonicalUrl("/"),
        email: BRAND.contactEmail,
        description: BRAND.shortDescription,
      },
      {
        "@type": "WebSite",
        "@id": `${canonicalUrl("/")}#website`,
        name: "KOB",
        url: canonicalUrl("/"),
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/**
 * Homepage, product and for-ai only. Google's Software App rich result also wants a rating or reviews, which KOB won't
 * invent, so this stays off /pricing and the guides to keep their rich results clean.
 */
export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": SOFTWARE_ID,
    name: "KOB",
    url: canonicalUrl("/product"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "KOB is the restaurant manager for independent restaurants. It reads reviews and drafts the replies, drafts Google listing fixes, and sends a morning brief. The owner approves, taps once, and posts.",
    audience: { "@type": "Audience", audienceType: "Independent restaurant owners and general managers" },
    publisher: { "@id": ORGANIZATION_ID },
    offers: [
      { "@type": "Offer", price: String(FOUNDING_PRICES.US.amount), priceCurrency: "USD", url: canonicalUrl("/pricing") },
      { "@type": "Offer", price: String(FOUNDING_PRICES.GB.amount), priceCurrency: "GBP", url: canonicalUrl("/pricing") },
    ],
  };
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
