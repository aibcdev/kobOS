import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "Solutions | KOB",
  description:
    "AI reports and growth tools for full-service restaurants, cafés, QSR, and groups—fix online sales leaks by venue type.",
};

const SOLUTIONS = [
  {
    id: "full-service",
    title: "Full-service restaurants",
    description:
      "Protect discovery, reservations, and premium perception. We emphasise menu storytelling, local SEO, and direct booking paths—so you are not re-buying the same guest on ads every week.",
    href: "/demo",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "cafe",
    title: "Cafés & QSR",
    description:
      "Speed and clarity win. KOB highlights mobile performance, menu clarity, and repeat visits—without heavy enterprise overhead.",
    href: "/features/ai-menu",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "groups",
    title: "Groups & chains",
    description:
      "Shared playbooks with room for local nuance. Align brand, SEO, and promos across locations while measuring what each site moves.",
    href: "/pricing",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
  },
] as const;

export default function SolutionsHubPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Solutions"
        title="Fix online sales by how you operate."
        description="Full-service, café, or multi-site—KOB’s AI report shows what to fix on website, SEO, and ordering for your model."
      />

      <SaasSection className="bg-[#fbf8f5]">
        <div className="space-y-16">
          {SOLUTIONS.map((s, i) => (
            <article
              key={s.id}
              id={s.id}
              className={`grid scroll-mt-24 grid-cols-1 items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""}`}
            >
              <div>
                <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#2c2c2c]">{s.title}</h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#2c2c2c]/75">{s.description}</p>
                <Link href={s.href} className="mt-6 inline-block text-sm font-medium text-[#088924] underline-offset-4 hover:underline">
                  Learn more
                </Link>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#2c2c2c]/10">
                <Image src={s.image} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
              </div>
            </article>
          ))}
        </div>
      </SaasSection>
    </>
  );
}
