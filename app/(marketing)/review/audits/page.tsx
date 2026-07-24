import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Team audit review · KOB",
  description: "Shareable static audit links for team review — no login, no JavaScript required.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Team landing page: lists recent audits with static /share links that any tool can read.
 */
export default async function TeamAuditReviewPage() {
  const audits = await prisma.visibilityAudit.findMany({
    where: {
      OR: [{ slug: { not: null } }, { id: { not: "" } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      slug: true,
      restaurantName: true,
      city: true,
      overallScore: true,
      updatedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-[#f9f3ed] text-[#1a1a1a]">
      <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5c]">KOB · Internal</p>
        <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight">Team audit review</h1>
        <p className="mt-3 text-base leading-relaxed text-[#5c5c5c]">
          Use the <strong>Share (static HTML)</strong> links below. They are plain HTML — no login and no
          client JavaScript — so browsers and review tools can read the full Opportunity Report.
        </p>
        <p className="mt-2 text-sm text-[#5c5c5c]">
          Avoid relying on the interactive dashboard URL if your tool cannot render Next.js apps.
        </p>

        <ol className="mt-10 space-y-6">
          {audits.map((a, i) => {
            const key = a.slug || a.id;
            const share = `https://trykob.com/audit/${key}/share`;
            const interactive = `https://trykob.com/audit/${key}`;
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-[#e5e5e5] bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-sm text-[#5c5c5c]">#{i + 1}</p>
                <p className="mt-1 text-lg font-semibold">
                  {a.restaurantName}
                  {a.city ? ` — ${a.city}` : ""}
                </p>
                <p className="mt-1 text-sm text-[#5c5c5c]">
                  Score {a.overallScore} · Updated{" "}
                  {a.updatedAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
                <p className="mt-4 break-all text-sm">
                  <a className="font-semibold text-[#094413] underline" href={share}>
                    Share (static HTML) — open this
                  </a>
                </p>
                <p className="mt-2 break-all text-xs text-[#5c5c5c]">
                  <a className="underline" href={interactive}>
                    Interactive dashboard (optional)
                  </a>
                </p>
                <p className="mt-3 rounded-lg bg-[#f4f4f5] px-3 py-2 font-mono text-xs text-[#1a1a1a]">
                  {share}
                </p>
              </li>
            );
          })}
        </ol>

        {audits.length === 0 ? (
          <p className="mt-8 text-sm text-[#5c5c5c]">No audits in the database yet.</p>
        ) : null}

        <p className="mt-12 text-sm">
          <Link href="/" className="text-[#094413] underline">
            ← Back to KOB
          </Link>
        </p>
      </div>
    </div>
  );
}
