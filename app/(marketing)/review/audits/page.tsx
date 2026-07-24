import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "Team audit review · KOB",
  description: "Live audit website links for team review.",
  robots: { index: false, follow: false },
};

const SAMPLES = [
  { slug: "kingsway-karahi-luton", name: "Kingsway Karahi" },
  { slug: "afterhours-london", name: "Afterhours London" },
  { slug: "the-curry-kitchen", name: "The Curry Kitchen" },
  { slug: "osaka", name: "Osaka" },
  { slug: "ambiance", name: "Ambiance" },
] as const;

/**
 * Team index of live audit website pages (full Opportunity Report UI).
 */
export default function TeamAuditReviewPage() {
  let fromPublic: string[] = [];
  try {
    fromPublic = readdirSync(join(process.cwd(), "public", "audit-reviews"))
      .filter((f) => f.endsWith(".txt") && f !== "INDEX.txt")
      .map((f) => f.replace(/\.txt$/, ""))
      .sort();
  } catch {
    fromPublic = [];
  }

  const slugs = fromPublic.length
    ? fromPublic
    : SAMPLES.map((s) => s.slug);

  const nameFor = (slug: string) =>
    SAMPLES.find((s) => s.slug === slug)?.name ?? slug.replace(/-/g, " ");

  return (
    <div className="min-h-screen bg-[#f9f3ed] text-[#1a1a1a]">
      <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5c]">KOB · Internal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team audit review</h1>
        <p className="mt-3 text-base leading-relaxed text-[#5c5c5c]">
          Open the live website report (full Opportunity Report UI — no login).
        </p>

        <p className="mt-8 text-sm font-semibold">Sample — Kingsway Karahi</p>
        <p className="mt-2 rounded-xl bg-white px-4 py-3 font-mono text-sm break-all shadow-sm">
          <a className="font-semibold text-[#094413] underline" href="/audit/kingsway-karahi-luton">
            https://trykob.com/audit/kingsway-karahi-luton
          </a>
        </p>

        <ol className="mt-10 list-decimal space-y-3 pl-5 text-sm">
          {slugs.map((slug) => (
            <li key={slug}>
              <a className="font-medium text-[#094413] underline" href={`/audit/${slug}`}>
                {nameFor(slug)}
              </a>
              <span className="mt-0.5 block font-mono text-xs text-[#5c5c5c]">
                /audit/{slug}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
