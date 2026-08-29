import type { Metadata } from "next";
import Link from "next/link";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { articlePath, listResourceArticles } from "@/lib/marketing/resources";

export const metadata: Metadata = {
  title: "Resources | KOB",
  description:
    "Best-of and comparison guides for restaurant owners — marketing software, Owner.com alternatives, UK independents, and free SEO audits.",
  alternates: { canonical: "https://trykob.com/resources" },
  robots: { index: true, follow: true },
};

export default function ResourcesHubPage() {
  const articles = listResourceArticles();

  return (
    <>
      <SaasPageHero
        eyebrow="Best-of · compare · buyer guides"
        title="Resources"
        description="Quotable guides for independent restaurant owners: best X for Z, software vs agency, and free audit paths — written to be useful in search and AI answers."
      />

      <SaasSection className="bg-[#fbf8f5]">
        <ul className="mx-auto grid max-w-[83rem] gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={articlePath(article.slug)}
                className="block h-full rounded-3xl border border-[#2c2c2c]/10 bg-[#f9f3ed] px-6 py-6 transition-colors hover:border-[#088924]/40"
              >
                <p className="font-mono-brand text-[11px] font-semibold uppercase tracking-wider text-[#088924]">
                  {article.tags.includes("comparison") ? "Compare" : "Best-of"}
                </p>
                <h2 className="font-heading mt-2 text-xl font-semibold leading-snug text-[#2c2c2c]">
                  {article.title}
                </h2>
                <p className="font-body mt-3 text-sm leading-relaxed text-[#2c2c2c]/70">
                  {article.description}
                </p>
                <p className="mt-4 text-xs text-[#2c2c2c]/45">Updated {article.updatedAt}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-center text-sm text-[#2c2c2c]/60">
          Prefer a live scan of your venue?{" "}
          <Link href="/go/audit" className="font-medium text-[#088924] underline-offset-2 hover:underline">
            Free restaurant audit
          </Link>
          . Happy with KOB? Ask us for a G2/Capterra link after your audit — we never pay for reviews.
        </p>
      </SaasSection>
    </>
  );
}
