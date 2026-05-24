import type { Metadata } from "next";
import { SaasCardGrid } from "@/components/marketing/saas/SaasCardGrid";
import { SaasPageHero, SaasPrimaryCta, SaasSecondaryCta } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { marketingCopy } from "@/lib/marketing/copy";
import { ownerProductPillars } from "@/lib/marketing/owner-pillars";

export const metadata: Metadata = {
  title: "Product | KOB",
  description:
    "Websites, SEO, and direct ordering for restaurants—plus a free AI report that shows what to fix before you spend on ads.",
};

export default function ProductHubPage() {
  return (
    <>
      <SaasPageHero
        variant="inset"
        eyebrow="Product"
        title="Websites, SEO, and ordering—built for restaurants."
        description={marketingCopy.productSubline}
      >
        <SaasPrimaryCta href="/audit">{marketingCopy.cta.aiReport}</SaasPrimaryCta>
        <SaasSecondaryCta href="/demo">{marketingCopy.cta.freeDemo}</SaasSecondaryCta>
      </SaasPageHero>

      <SaasSection className="bg-[#fbf8f5]">
        <h2 className="font-heading mb-8 text-2xl font-semibold tracking-tight text-[#2c2c2c] md:text-3xl">
          {marketingCopy.useAiToFix}
        </h2>
        <SaasCardGrid
          columns={2}
          items={ownerProductPillars.map((p) => ({
            title: p.title,
            description: p.description,
            href: p.href,
            image:
              p.slug === "website"
                ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=85"
                : p.slug === "online-ordering"
                  ? "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=85"
                  : p.slug === "delivery"
                    ? "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=85"
                    : "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=85",
            imageAlt: p.title,
          }))}
        />
      </SaasSection>

      <SaasSection className="border-t border-[#2c2c2c]/5 bg-[#f9f3ed]">
        <SaasCardGrid
          columns={2}
          items={[
            {
              title: "Growth Agent",
              description:
                "A ranked weekly plan across SEO, site, and direct demand—with drafts your team can publish fast.",
              href: "/login",
              image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Restaurant team at service",
            },
            {
              title: "Digital menus & SEO",
              description:
                "Structured pages, menus, and neighbourhood intent built for high-converting searches—not vanity traffic.",
              href: "/features/ai-menu",
              image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Menu and search",
            },
            {
              title: "Built for restaurants",
              description:
                "From full-service to high-volume daytime, KOB focuses on the guest journey your P&L depends on.",
              href: "/solutions",
              image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Dining experience",
            },
            {
              title: "Brand & guest experience",
              description: "Keep tone, visuals, and conversion paths coherent from search to booking.",
              href: "/features/branding",
              image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Food photography",
            },
          ]}
        />
      </SaasSection>
    </>
  );
}
