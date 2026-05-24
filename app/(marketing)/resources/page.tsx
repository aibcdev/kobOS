import type { Metadata } from "next";
import Link from "next/link";
import { SaasCardGrid } from "@/components/marketing/saas/SaasCardGrid";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";

export const metadata: Metadata = {
  title: "Resources | KOB",
  description: "Guides and growth topics for operators who want clearer priorities online.",
};

export default function ResourcesHubPage() {
  return (
    <>
      <SaasPageHero
        title="Resources"
        description="Guides on SEO, websites, and direct ordering—written for restaurant operators, not agencies."
      />

      <SaasSection className="bg-[#fbf8f5]">
        <SaasCardGrid
          columns={2}
          items={[
            {
              title: "Guides",
              description:
                "Deep dives on fixing slow mobile sites, structuring menus for search, and building local landing pages that convert.",
              image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Planning at a desk",
            },
            {
              title: "Growth playbook",
              description: "How to run a weekly rhythm: diagnose, ship, measure—without drowning in dashboards.",
              href: "/product",
              image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=85",
              imageAlt: "Team collaboration",
            },
          ]}
        />
        <p className="mt-12 text-center text-sm text-[#2c2c2c]/60">
          More articles coming soon.{" "}
          <Link href="/audit" className="font-medium text-[#088924] underline-offset-2 hover:underline">
            Get my AI report
          </Link>
        </p>
      </SaasSection>
    </>
  );
}
