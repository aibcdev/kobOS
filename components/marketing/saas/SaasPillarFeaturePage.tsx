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
      { title: "Free scan first", description: "See what guests notice on your site before you spend on a redesign." },
      { title: "Daily fix list", description: "Photos, speed, and menu clarity—added to your morning tasks." },
      { title: "Mobile matters", description: "Most guests check on a phone. We flag what looks off." },
      { title: "Plain language", description: "No SEO jargon—just what to change and why." },
    ],
    "online-ordering": [
      { title: "Clear book/order buttons", description: "Guests should not hunt for how to reserve or order." },
      { title: "Menu visibility", description: "If the menu is hard to find, we add a task to fix it." },
      { title: "Matches how you operate", description: "Pickup, dine-in, delivery—whatever you actually offer." },
      { title: "Tied to your scan", description: "Issues from your report become tasks—not a separate product pitch." },
    ],
    delivery: [
      { title: "Hours that stay current", description: "Bank holidays and seasonal changes flagged early." },
      { title: "Listing accuracy", description: "Google hours and delivery info guests rely on." },
      { title: "Holiday reminders", description: "Draft posts and closure notes before the busy weekend." },
      { title: "One less app to check", description: "Tasks land in the same daily list as reviews and posts." },
    ],
    marketing: [
      { title: "Review replies", description: "Draft responses you approve—nothing posts automatically." },
      { title: "Holiday posts", description: "Mother's Day, Valentine's, bank holidays—prepared ahead." },
      { title: "Slow-week prompts", description: "Gentle nudges when you have not posted in a while." },
      { title: "Your tone", description: "Pick how your helper writes—warm, direct, or concise." },
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
