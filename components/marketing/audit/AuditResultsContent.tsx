import Link from "next/link";
import type { VisibilityAudit } from "@prisma/client";
import { AuditReportDashboard } from "@/components/marketing/audit/AuditReportDashboard";
import { AuditUnlockModal } from "@/components/marketing/audit/AuditUnlockModal";
import type { AuditBenchmarkPollSnapshot } from "@/components/marketing/audit/use-audit-benchmark-poll";
import { auditCard, auditCardMuted } from "@/lib/marketing/audit-theme";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import { buildPerceptionTeaserFromPayload } from "@/lib/marketing/audit-scan-preview";
import type { AuditResultPayload } from "@/lib/audit/types";
import { marketingCopy } from "@/lib/marketing/copy";

export function AuditResultsContent({
  audit,
  payload,
  scanStillRunning = false,
}: {
  scanStillRunning?: boolean;
  audit: Pick<
    VisibilityAudit,
    | "id"
    | "restaurantName"
    | "city"
    | "websiteUrl"
    | "leadCapturedAt"
    | "leadEmail"
    | "createdAt"
    | "overallScore"
    | "seoScore"
    | "designScore"
    | "mobileScore"
    | "conversionScore"
    | "updatedAt"
  >;
  payload: AuditResultPayload;
}) {
  const unlocked = Boolean(audit.leadCapturedAt);
  const perceptionTeaser = buildPerceptionTeaserFromPayload(payload, audit.overallScore);

  const benchmarkInitial: AuditBenchmarkPollSnapshot = {
    scoresPending: payload.scoresPending,
    benchmarkV1Status: payload.benchmarkV1Status,
    benchmarkV1: payload.benchmarkV1 ?? null,
    benchmarkV1Error: payload.benchmarkV1Error,
    benchmarkV1MediaStatus: payload.benchmarkV1MediaStatus,
    benchmarkV1Media: payload.benchmarkV1Media ?? null,
    benchmarkV1MediaError: payload.benchmarkV1MediaError,
    perceptionAuditV1Status: payload.perceptionAuditV1Status,
    perceptionAuditV1: payload.perceptionAuditV1 ?? null,
    perceptionAuditV1Error: payload.perceptionAuditV1Error,
    scanStatus: payload.scanStatus,
    browserbaseScan: payload.browserbaseScan ?? null,
    evidencePack: payload.evidencePack
      ? {
          imageCandidates: payload.evidencePack.imageCandidates ?? [],
          mediaAssetsMeta: payload.evidencePack.mediaAssetsMeta,
        }
      : null,
    scores: payload.scores,
    overallScore: audit.overallScore,
    seoScore: audit.seoScore,
    designScore: audit.designScore,
    mobileScore: audit.mobileScore,
    conversionScore: audit.conversionScore,
    perceptionTeaser,
  };

  const competitorNames = payload.competitors.slice(0, 2).map((c) => c.name);
  const perception = payload.perceptionAuditV1;
  const ownerHero =
    perception?.ownerHero ??
    (perception ? buildOwnerHeroFallback(payload, perception) : perceptionTeaser.ownerHero);

  const unlockTeaser = {
    score: perception?.digitalPositioningScore ?? perceptionTeaser.digitalPositioningScore,
    leakPercentLow: ownerHero?.bookingLeakPercentLow,
    leakPercentHigh: ownerHero?.bookingLeakPercentHigh,
    revenueLeakCount: perception?.revenueLeaks?.length ?? perceptionTeaser.revenueLeakCount,
    screenshotUrl: perceptionTeaser.screenshotUrl,
  };

  return (
    <>
      <AuditUnlockModal
        auditId={audit.id}
        restaurantName={audit.restaurantName}
        competitorNames={competitorNames}
        teaser={unlockTeaser}
        open={!unlocked}
      />

      <AuditReportDashboard
        audit={audit}
        payload={payload}
        benchmarkInitial={benchmarkInitial}
        unlocked={unlocked}
        scanStillRunning={scanStillRunning}
      />

      {unlocked ? (
        <div className="mx-auto max-w-[90rem] border-t border-[var(--color-hairline)] bg-[#f9fafb] px-6 py-12 md:px-10 lg:pl-[calc(14rem+2.5rem)]">
          <div className="max-w-3xl space-y-14">
            <p className="rounded-2xl border border-[var(--color-hairline)] bg-white px-5 py-4 text-sm leading-relaxed text-[var(--color-muted)]">
              {marketingCopy.auditUpgrade.body}
            </p>
            <section>
              <h2 className="font-head text-xl font-semibold">Opportunities</h2>
              <ul className="mt-4 space-y-3">
                {payload.opportunities.map((o) => (
                  <li key={o.title} className={`${auditCard} flex flex-col gap-1 p-5 sm:flex-row sm:justify-between`}>
                    <span className="font-medium">{o.title}</span>
                    <span className="text-sm text-[var(--color-muted)]">{o.impactEstimate}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${auditCardMuted} p-8`}>
              <h2 className="font-head text-xl font-semibold">30 / 60 / 90 roadmap</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {(
                  [
                    ["30 days", payload.gated.roadmap.days30],
                    ["60 days", payload.gated.roadmap.days60],
                    ["90 days", payload.gated.roadmap.days90],
                  ] as const
                ).map(([label, items]) => (
                  <div key={label}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">{label}</h3>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--color-muted)]">
                      {items.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white px-6 text-sm font-medium no-underline"
              >
                View pricing
              </Link>
              <Link href="/audit" className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--color-muted)] underline">
                New scan
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
