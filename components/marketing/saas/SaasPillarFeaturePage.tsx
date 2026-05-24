import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { marketingCopy } from "@/lib/marketing/copy";
import type { OwnerProductPillar } from "@/lib/marketing/owner-pillars";

import { SaasCardGrid } from "./SaasCardGrid";
import type { SaasCardItem } from "./SaasCardGrid";
import { SaasPrimaryCta, SaasSecondaryCta } from "./SaasPageHero";
import { SaasSection } from "./SaasSection";

const PILLAR_IMAGES: Record<OwnerProductPillar["slug"], { src: string; alt: string }> = {
  website: {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
    alt: "Restaurant website on mobile",
  },
  "online-ordering": {
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85",
    alt: "Guest ordering on phone",
  },
  delivery: {
    src: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=85",
    alt: "Delivery and takeaway",
  },
  marketing: {
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85",
    alt: "Marketing analytics",
  },
};

function pillarBulletsFor(slug: OwnerProductPillar["slug"]): SaasCardItem[] {
  const map: Record<OwnerProductPillar["slug"], SaasCardItem[]> = {
    website: [
      { title: "Sales-first layouts", description: "Menus, hours, and book/order CTAs above the fold—not buried in PDFs." },
      { title: "AI-ranked fixes", description: "Your free report shows what to change before you redesign." },
      { title: "Mobile speed", description: "Pages that load fast enough guests do not bounce to competitors." },
      { title: "On-brand copy", description: "Words that match your room—structured for Google and guests." },
    ],
    "online-ordering": [
      { title: "Direct orders", description: "Guests order on your site—not a marketplace that takes a cut." },
      { title: "Clear menus", description: "Modifiers, allergens, and upsells without confusing checkout." },
      { title: "Pickup & dine-in", description: "Paths that match how you actually operate." },
      { title: "Tied to the AI report", description: "See ordering leaks alongside SEO and photos." },
    ],
    delivery: [
      { title: "Keep margin", description: "Push guests to direct delivery instead of app fees every month." },
      { title: "Own the experience", description: "Branded tracking and comms—not a generic aggregator screen." },
      { title: "Zone clarity", description: "Fees and ETAs guests understand before they pay." },
      { title: "Works with your site", description: "One story from search → menu → order." },
    ],
    marketing: [
      { title: "Weekly priorities", description: "Growth Agent ranks what to publish and where." },
      { title: "Local promos", description: "Offers matched to neighbourhood search intent." },
      { title: "Review momentum", description: "Reply patterns that protect reputation on Google." },
      { title: "Measure what moved", description: "Know which fixes shifted discovery and orders." },
    ],
  };
  return map[slug];
}

function SaasSplitHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[#2c2c2c]/5 bg-white px-6 py-14 md:px-12 md:py-24">
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-left">
          {eyebrow ? (
            <p className="font-mono-brand mb-4 text-xs font-semibold uppercase tracking-widest text-[#088924]">{eyebrow}</p>
          ) : null}
          <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-[#2c2c2c] md:text-5xl">{title}</h1>
          <p className="mt-6 text-lg leading-relaxed text-[#2c2c2c]/75">{description}</p>
          {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#2c2c2c]/10">
          <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" priority />
        </div>
      </div>
    </section>
  );
}

export function SaasPillarFeaturePage({ pillar }: { pillar: OwnerProductPillar }) {
  const img = PILLAR_IMAGES[pillar.slug];
  const bullets = pillarBulletsFor(pillar.slug);

  return (
    <>
      <SaasSplitHero eyebrow={pillar.title} title={pillar.headline} description={pillar.description} image={img.src} imageAlt={img.alt}>
        <SaasPrimaryCta href="/audit">{marketingCopy.cta.aiReport}</SaasPrimaryCta>
        <SaasSecondaryCta href="/demo">{marketingCopy.cta.freeDemo}</SaasSecondaryCta>
      </SaasSplitHero>

      <SaasSection className="bg-[#fbf8f5]">
        <SaasCardGrid items={bullets} />
      </SaasSection>

      <SaasSection className="border-t border-[#2c2c2c]/10 bg-[#094413] text-center text-[#fbf8f5]">
        <h2 className="font-heading mb-4 text-2xl font-semibold md:text-3xl">{marketingCopy.losingSalesOnline}</h2>
        <p className="mx-auto mb-8 max-w-xl text-white/90">{marketingCopy.useAiToFix}</p>
        <Link
          href="/audit"
          className="inline-flex h-12 items-center rounded-full bg-[#fbf8f5] px-8 text-sm font-medium text-[#094413] transition-colors hover:bg-white"
        >
          {marketingCopy.cta.aiReport}
        </Link>
      </SaasSection>
    </>
  );
}
