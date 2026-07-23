"use client";

import Link from "next/link";
import type { VisibilityAudit } from "@prisma/client";
import { useCallback, useState } from "react";
import { AuditFunnelHeader } from "@/components/marketing/audit/AuditFunnelHeader";
import { AuditPerceptionGapTable } from "@/components/marketing/audit/AuditPerceptionGapTable";
import { AuditPerceptionHero } from "@/components/marketing/audit/AuditPerceptionHero";
import { AuditPositioningTable } from "@/components/marketing/audit/AuditPositioningTable";
import {
  AuditCommercialSeoBlock,
  AuditNarrativeSection,
  AuditReviewSocialIntel,
} from "@/components/marketing/audit/AuditNarrativeSection";
import { AuditVisualScorecard, AuditExecutiveSummary } from "@/components/marketing/audit/AuditVisualScorecard";
import {
  AuditEvidenceSources,
  AuditEvidenceSourcesDetail,
  collectAuditEvidenceSources,
  formatEvidenceSourcesSummary,
} from "@/components/marketing/audit/AuditEvidenceSources";
import { AuditUpgradePanel } from "@/components/marketing/audit/AuditUpgradePanel";
import { AuditRevenueLeaks } from "@/components/marketing/audit/AuditRevenueLeaks";
import { useAuditBenchmarkPoll } from "@/components/marketing/audit/use-audit-benchmark-poll";
import type { AuditBenchmarkPollSnapshot } from "@/components/marketing/audit/use-audit-benchmark-poll";
import { isAuditScoresReady } from "@/lib/audit/audit-score-display";
import { auditBlurGate } from "@/lib/marketing/audit-theme";
import { buildTeaserPerception } from "@/lib/marketing/audit-scan-preview";
import { marketingCopy } from "@/lib/marketing/copy";
import { onlineHealthLabel } from "@/lib/marketing/audit-grader-phases";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";
import { gradeMeaning } from "@/lib/audit/restaurant-scoring";
import type { AuditResultPayload, BenchmarkV1Section, RestaurantScoresV1 } from "@/lib/audit/types";

type NavId = "overview" | "reviews" | "discovery" | "competitors" | "technical";

const NAV: { id: NavId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews & Social" },
  { id: "discovery", label: "Local discovery" },
  { id: "competitors", label: "Competitors" },
  { id: "technical", label: "Technical detail" },
];

function scoreTone(score: number) {
  if (score < 45)
    return { bar: "bg-[#ea580c]", stroke: "#ea580c", text: "text-[#ea580c]", badge: "CRITICAL ACTION NEEDED" };
  if (score < 65)
    return { bar: "bg-[#d97706]", stroke: "#d97706", text: "text-[#d97706]", badge: "NEEDS ATTENTION" };
  return {
    bar: "bg-[var(--color-accent)]",
    stroke: "var(--color-accent)",
    text: "text-[var(--color-accent)]",
    badge: "STRONG FOUNDATION",
  };
}

function ScoreRing({
  score,
  size = 120,
  grade,
}: {
  score: number;
  size?: number;
  grade?: string;
}) {
  const tone = scoreTone(score);
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {grade ? (
          <>
            <span className={`font-head text-4xl font-semibold leading-none ${tone.text}`}>{grade}</span>
            <span className="mt-0.5 text-xs font-medium tabular-nums text-[var(--color-muted-medium)]">{score}</span>
          </>
        ) : (
          <span className={`font-head text-4xl font-semibold tabular-nums ${tone.text}`}>{score}</span>
        )}
      </div>
    </div>
  );
}

const RESTAURANT_AXIS_STRIP: { key: keyof Pick<RestaurantScoresV1, "reviews" | "gbp" | "website" | "competitors" | "technical">; label: string }[] = [
  { key: "reviews", label: "Reviews" },
  { key: "gbp", label: "GBP" },
  { key: "website", label: "Website" },
  { key: "competitors", label: "Competitive" },
  { key: "technical", label: "Technical" },
];

function RestaurantAxisStrip({ scores }: { scores: RestaurantScoresV1 }) {
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Restaurant scorecard
          </p>
          <p className="mt-1 font-head text-lg font-semibold">
            Grade {scores.grade} · {scores.overall}/100
          </p>
        </div>
        <p className="text-xs text-[var(--color-muted-medium)]">Confidence: {scores.confidence}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {RESTAURANT_AXIS_STRIP.map(({ key, label }) => {
          const value = scores[key];
          const tone = scoreTone(value);
          return (
            <div key={key} className="rounded-xl bg-[var(--color-surface-cream)]/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
                {label}
              </p>
              <p className={`mt-1 font-head text-xl font-semibold tabular-nums ${tone.text}`}>{value}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
        C = average for restaurants. {gradeMeaning(scores.grade)}.
        {scores.dataGaps?.length ? ` Gaps: ${scores.dataGaps.slice(0, 2).join("; ")}.` : null}
      </p>
    </div>
  );
}

function competitorInsightCopy(
  payload: AuditResultPayload,
  benchmark: AuditBenchmarkPollSnapshot["benchmarkV1"],
  city: string,
): string {
  const top = payload.issues[0];
  if (top?.fixHint) return `${top.title} — ${top.fixHint}`;
  if (top?.title) return top.title;
  if (benchmark?.overallSummary?.trim()) return benchmark.overallSummary.trim();
  const opp = payload.opportunities[0];
  if (opp?.title) return opp.title;
  return `Focus on fixes that improve how guests find and book you in ${city}.`;
}

function BenchmarkSectionCard({ title, section }: { title: string; section: BenchmarkV1Section }) {
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/60 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-head text-base font-semibold">{title}</h3>
        <div className="text-right">
          <p className="font-head text-3xl font-semibold tabular-nums text-[var(--color-primary)]">{section.score}</p>
          <p className="text-xs uppercase text-[var(--color-muted-medium)]">Confidence: {section.confidence}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {section.checks.slice(0, 5).map((c) => (
          <li key={c.id} className="text-sm text-[var(--color-ink)]">
            <span className={c.pass ? "text-[var(--color-accent)]" : "text-amber-800"}>{c.pass ? "✓" : "○"}</span>{" "}
            <span className="font-medium">{c.id.replace(/_/g, " ")}</span>
            <span className="text-[var(--color-muted)]"> — {c.detail}</span>
          </li>
        ))}
      </ul>
      {section.topGaps.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-[var(--color-muted-medium)]">Gaps</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[var(--color-ink)]">
            {section.topGaps.slice(0, 3).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function analysisStatusLines(data: AuditBenchmarkPollSnapshot): string[] {
  const lines: string[] = [];
  if (data.scanStatus === "pending" || data.scoresPending) {
    lines.push("Finishing your site scan — scores update when ready.");
  }
  if (data.perceptionAuditV1Status === "pending") {
    lines.push("Scoring digital positioning…");
  }
  if (data.benchmarkV1Status === "pending") {
    lines.push("AI benchmark still running in the background…");
  }
  if (data.benchmarkV1MediaStatus === "pending") {
    lines.push("Reviewing photos for visual scoring…");
  }
  if (data.benchmarkV1MediaStatus === "failed" && data.benchmarkV1MediaError) {
    lines.push(`Visual analysis unavailable: ${data.benchmarkV1MediaError}`);
  }
  if (data.benchmarkV1MediaStatus === "skipped") {
    lines.push("No public images found for automatic visual scoring.");
  }
  return lines;
}

function reviewsHealthScore(
  data: AuditBenchmarkPollSnapshot,
  payload: AuditResultPayload,
): number {
  return (
    data.benchmarkV1?.brandSocialPresence?.score ??
    payload.rubricV2?.brandSocialPresence ??
    Math.round((data.seoScore + data.designScore) / 2)
  );
}

function PillarCard({
  label,
  value,
  max,
  urgent,
}: {
  label: string;
  value: number;
  max: number;
  urgent?: boolean;
}) {
  const pct = Math.round((value / max) * 100);
  const tone = scoreTone(pct);
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">{label}</p>
        {urgent ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
            Urgent
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-head text-2xl font-semibold tabular-nums">
        {value}
        <span className="text-lg font-normal text-[var(--color-muted-medium)]">/{max}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AuditReportDashboard({
  audit,
  payload,
  benchmarkInitial,
  unlocked,
  scanStillRunning,
}: {
  audit: Pick<
    VisibilityAudit,
    | "id"
    | "restaurantName"
    | "city"
    | "websiteUrl"
    | "leadEmail"
    | "overallScore"
    | "seoScore"
    | "designScore"
    | "mobileScore"
    | "conversionScore"
    | "updatedAt"
  >;
  payload: AuditResultPayload;
  benchmarkInitial: AuditBenchmarkPollSnapshot;
  unlocked: boolean;
  scanStillRunning?: boolean;
}) {
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const { data, timedOut, retrying, retryAnalysis } = useAuditBenchmarkPoll(audit.id, benchmarkInitial, {
    unlocked,
  });
  const scoresReady = unlocked && isAuditScoresReady({ scoresPending: data.scoresPending, scanStatus: data.scanStatus });
  const overall = scoresReady ? data.overallScore : audit.overallScore;
  const restaurantScores = data.restaurantScores ?? payload.restaurantScores ?? null;
  const perceptionPending = (data.perceptionAuditV1Status ?? payload.perceptionAuditV1Status) === "pending";
  const teaserPerception =
    data.perceptionTeaser && !unlocked
      ? buildTeaserPerception(data.perceptionTeaser, payload)
      : null;
  const perception = data.perceptionAuditV1 ?? payload.perceptionAuditV1 ?? teaserPerception;
  const displayScore = restaurantScores?.overall ?? perception?.digitalPositioningScore ?? overall;
  const displayTone = scoreTone(displayScore);
  const healthLabel = restaurantScores
    ? `Grade ${restaurantScores.grade} · ${onlineHealthLabel(displayScore)}`
    : onlineHealthLabel(displayScore);
  const tone = scoreTone(restaurantScores?.overall ?? overall);
  const restaurantDisplay = decodeHtmlEntities(audit.restaurantName);
  const locationLabel = `${restaurantDisplay}, ${audit.city}`;
  const trialCheckoutHref = `/audit/${audit.id}/upgrade/checkout`;
  const reportUrl =
    typeof window !== "undefined" ? `${window.location.origin}/audit/${audit.id}` : `/audit/${audit.id}`;

  const shareReport = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : reportUrl;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${restaurantDisplay} — KOB perception report`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel(marketingCopy.auditReport.shareCopied);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareLabel(marketingCopy.auditReport.shareCopied);
      } catch {
        setShareLabel(marketingCopy.auditReport.shareFailed);
      }
    }
    window.setTimeout(() => setShareLabel(null), 3000);
  }, [reportUrl, restaurantDisplay]);

  const issueIcons = ["🔴", "🟠", "🟡"] as const;
  const reviewsScore = reviewsHealthScore(data, payload);
  const analysisLines = unlocked ? analysisStatusLines(data) : [];
  const competitorsFromPlaces =
    payload.competitors.length > 0 && payload.competitors.some((c) => c.source === "places");
  const competitorInsight = competitorInsightCopy(payload, data.benchmarkV1, audit.city);
  const meta = data.evidencePack?.mediaAssetsMeta;
  const cands = data.evidencePack?.imageCandidates ?? [];
  const mediaThumbs = meta && meta.length > 0 ? meta : cands;
  const showMedia = unlocked && data.benchmarkV1MediaStatus === "ready" && data.benchmarkV1Media;
  const showVideo = showMedia && Boolean(data.benchmarkV1Media?.videoPresentationQuality);
  const showHeaderScoreRing = Boolean(restaurantScores) || !perception || perceptionPending;

  return (
    <div className="min-h-screen bg-[var(--color-surface-warm)] text-[var(--color-ink)]">
      <AuditFunnelHeader
        showTrialCta={unlocked}
        ctaHref={unlocked ? trialCheckoutHref : "/pricing"}
        ctaLabel="Start 7-day free trial"
      />

      <div className="mx-auto flex max-w-[90rem] gap-0">
        <aside className="hidden w-56 shrink-0 border-r border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/80 px-4 py-8 lg:block">
          <div className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold">
              K
            </span>
            <div>
              <p className="font-head text-sm font-semibold">KOB</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">AI Report</p>
            </div>
          </div>
          <nav className="space-y-1" aria-label="Report sections">
            {NAV.map((item) => {
              const navLocked = !unlocked && item.id !== "overview";
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={navLocked}
                  title={navLocked ? marketingCopy.auditReport.unlockNavHint : undefined}
                  onClick={() => {
                    if (!navLocked) setActiveNav(item.id);
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    navLocked
                      ? "cursor-not-allowed text-[var(--color-muted)]/50"
                      : activeNav === item.id
                        ? "border-l-2 border-[var(--color-primary)] bg-white text-[var(--color-primary)] shadow-sm"
                        : "text-[var(--color-muted)] hover:bg-white/80"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-10 rounded-[var(--radius-md)] bg-[var(--color-ink)] p-4 text-[var(--color-text-inverse)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              {marketingCopy.auditReport.dailyHelperLabel}
            </p>
            <p className="mt-2 text-sm leading-snug">
              {perception?.overallSummary?.slice(0, 160) ??
                "See the gap between how good you are in the room—and how you look online."}
            </p>
            {unlocked ? (
              <Link
                href={trialCheckoutHref}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-white/10 py-2 text-xs font-semibold text-white no-underline hover:bg-white/20"
              >
                {marketingCopy.cta.startTrial}
              </Link>
            ) : (
              <p className="mt-4 text-center text-xs font-semibold text-white/90">
                Unlock your report to see fixes
              </p>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-hairline)] bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3 rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-lg" aria-hidden>
                🍽
              </span>
              <span className="truncate text-sm font-medium">{locationLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void shareReport()}
                className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                {shareLabel ?? "Share report"}
              </button>
              {unlocked ? (
                <Link
                  href={trialCheckoutHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white no-underline shadow-[0_4px_14px_-2px_rgba(9,68,19,0.35)]"
                >
                  Start 7-day free trial →
                </Link>
              ) : null}
            </div>
          </div>

          <main className="relative px-6 py-8 md:px-10">
            {analysisLines.length ? (
              <ul className="mb-6 space-y-2">
                {analysisLines.map((line) => (
                  <li
                    key={line}
                    className="rounded-2xl border border-[#2c2c2c]/8 bg-[#f9f6f1] px-4 py-3 text-sm text-[#2c2c2c]/70"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}

            {scanStillRunning ? (
              <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Analysis still running — scores update automatically.
              </p>
            ) : null}

            <div>
              <div className="mb-8 flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:justify-between md:text-left">
                <div className="md:text-left">
                  <h1
                    className={
                      unlocked
                        ? "font-head text-3xl font-semibold tracking-tight md:text-4xl"
                        : "type-display-lg text-balance"
                    }
                  >
                    {unlocked ? "Your hospitality perception report" : "Your hospitality perception preview"}
                  </h1>
                  <p className="type-body-sm mt-2 text-[var(--color-muted)]">
                    {unlocked
                      ? `Generated ${new Date(audit.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} · ${formatEvidenceSourcesSummary(collectAuditEvidenceSources(payload))}`
                      : `${restaurantDisplay} · ${audit.city}`}
                  </p>
                  {unlocked ? (
                    <div className="mt-3">
                      <AuditEvidenceSources payload={payload} />
                    </div>
                  ) : null}
                </div>
                {showHeaderScoreRing ? (
                  <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white p-6 shadow-sm sm:flex-row sm:gap-6">
                    <ScoreRing
                      score={displayScore}
                      size={unlocked ? 120 : 140}
                      grade={restaurantScores?.grade}
                    />
                    <div className="text-center sm:text-left">
                      <p className="type-caption font-medium uppercase tracking-wide text-[var(--color-muted-medium)]">
                        {restaurantScores ? "Restaurant visibility" : "Digital positioning"}
                      </p>
                      <p className={`type-title-md mt-1 font-semibold ${displayTone.text}`}>{healthLabel}</p>
                      {unlocked ? (
                        <p className="type-body-sm mt-2 max-w-[220px] text-[var(--color-muted)]">
                          {restaurantScores
                            ? `Your score vs. similar restaurants in ${audit.city}.`
                            : perceptionPending
                              ? "Scoring digital positioning…"
                              : `Your score vs. similar restaurants in ${audit.city}.`}
                        </p>
                      ) : (
                        <p className="type-body-sm mt-2 max-w-[220px] text-[var(--color-muted)]">
                          Unlock to see fixes, competitors, and your 30/60/90 plan.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {activeNav === "overview" && (
                <div className="mb-8 space-y-8">
                  {restaurantScores ? <RestaurantAxisStrip scores={restaurantScores} /> : null}
                  <AuditPerceptionHero
                    perception={perception}
                    pending={perceptionPending}
                    timedOut={timedOut && perceptionPending}
                    retrying={retrying}
                    onRetry={() => {
                      void retryAnalysis();
                    }}
                    restaurantName={restaurantDisplay}
                    payload={payload}
                  />
                  {perception ? (
                    <div className={!unlocked ? auditBlurGate : ""}>
                      {perception.overallSummary ? (
                        <p className="rounded-2xl border border-[var(--color-hairline)] bg-white px-5 py-4 text-sm leading-relaxed text-[var(--color-muted)]">
                          {perception.overallSummary}
                        </p>
                      ) : null}
                      <AuditExecutiveSummary perception={perception} />
                      <AuditVisualScorecard rows={perception.visualScorecard} />
                      <AuditPositioningTable rows={perception.positioningTable} />
                      <AuditPerceptionGapTable rows={perception.perceptionGap} locked={!unlocked} />
                      {!unlocked && perception.revenueLeaks.length ? (
                        <p className="text-center text-sm font-medium text-[var(--color-primary)]">
                          {perception.revenueLeaks.length} revenue leaks identified — unlock to see the full gap
                        </p>
                      ) : null}
                      {unlocked ? <AuditRevenueLeaks leaks={perception.revenueLeaks} /> : null}
                      {unlocked ? <AuditEvidenceSourcesDetail payload={payload} /> : null}
                      {unlocked ? (
                        <AuditNarrativeSection
                          customerExperience={perception.customerExperience}
                          modernStandard={perception.modernStandard}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {activeNav === "reviews" && perception && unlocked ? (
                <div className="mb-8">
                  <AuditReviewSocialIntel
                    reviewIntelligence={perception.reviewIntelligence}
                    socialAnalysis={perception.socialAnalysis}
                  />
                </div>
              ) : null}

              {activeNav === "discovery" && perception && unlocked ? (
                <div className="mb-8 space-y-6">
                  <AuditCommercialSeoBlock text={perception.commercialSeo} />
                  {payload.gated.keywordOpportunities.length ? (
                    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
                      <h3 className="font-head text-base font-semibold">Keyword opportunities</h3>
                      <ul className="mt-4 list-inside list-disc text-sm text-[var(--color-muted)]">
                        {payload.gated.keywordOpportunities.slice(0, 6).map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeNav === "technical" && unlocked && (
                <div className="mb-8 space-y-8">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <PillarCard label="SEO score" value={data.seoScore} max={100} />
                    <PillarCard label="Reviews health" value={reviewsScore} max={100} />
                    <PillarCard
                      label="Conversion"
                      value={data.conversionScore}
                      max={100}
                      urgent={data.conversionScore < 30}
                    />
                  </div>
                  <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
                    <h2 className="font-head text-lg font-semibold">Technical checks</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">For your web team or agency</p>
                    <ul className="mt-6 space-y-5">
                      {payload.issues.slice(0, 6).map((issue, i) => (
                        <li
                          key={issue.title}
                          className="flex gap-4 border-b border-[var(--color-hairline)] pb-5 last:border-0 last:pb-0"
                        >
                          <span className="text-xl" aria-hidden>
                            {issueIcons[i] ?? "•"}
                          </span>
                          <div>
                            <p className="font-semibold">{issue.title}</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">{issue.fixHint}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}

              {activeNav === "competitors" && (
                <div className="mb-8 max-w-2xl">
                  {perception?.benchmarkAnchors.length ? (
                    <p className="mb-4 text-sm text-[var(--color-muted)]">
                      Peer benchmark: {perception.benchmarkAnchors.join(" · ")}
                    </p>
                  ) : null}
                    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
                      <h2 className="font-head text-lg font-semibold">Vs. local competitors</h2>
                      {competitorsFromPlaces ? (
                        <p className="mt-1 text-xs text-[var(--color-muted-medium)]">
                          Nearby independent restaurants from Google Places (UK).
                        </p>
                      ) : (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                          We could not verify your location on Google Maps, so we are not showing estimated peer
                          scores. Pick your restaurant from the Google dropdown on the audit page, or add your listing
                          on Google Business Profile.
                        </p>
                      )}
                      <ul className="mt-6 space-y-4">
                        <li>
                          <div className="mb-1 flex justify-between text-sm font-medium">
                            <span>{restaurantDisplay} (you)</span>
                            <span className={tone.text}>
                              {restaurantScores?.overall ?? overall}/100
                              {restaurantScores ? ` · ${restaurantScores.grade}` : ""}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
                            <div
                              className={`h-full rounded-full ${tone.bar}`}
                              style={{ width: `${restaurantScores?.overall ?? overall}%` }}
                            />
                          </div>
                        </li>
                        {competitorsFromPlaces
                          ? payload.competitors.slice(0, 3).map((c) => (
                              <li key={c.name}>
                                <div className="mb-1 flex justify-between text-sm">
                                  <span>{c.name}</span>
                                  <span className="text-[var(--color-muted)]">{c.mockScore}/100</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted-faint)]">
                                  <div
                                    className="h-full rounded-full bg-[var(--color-accent)]/70"
                                    style={{ width: `${c.mockScore}%` }}
                                  />
                                </div>
                                {c.note ? (
                                  <p className="mt-1 text-xs text-[var(--color-muted-medium)]">{c.note}</p>
                                ) : null}
                              </li>
                            ))
                          : null}
                      </ul>
                      {unlocked && (competitorsFromPlaces || payload.issues.length > 0) ? (
                        <div className="mt-6 rounded-xl bg-[var(--color-surface-cream)] p-4 text-sm leading-relaxed text-[var(--color-muted)]">
                          <span className="font-semibold text-[var(--color-accent)]">Priority · </span>
                          {competitorInsight}
                        </div>
                      ) : null}
                    </section>
                </div>
              )}

              {unlocked && activeNav === "technical" && data.benchmarkV1 && data.benchmarkV1Status === "ready" ? (
                <section id="seo" className="mb-8 space-y-6 rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="font-head text-lg font-semibold">Absolute benchmark</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Scored against global best-in-class hospitality brands.
                    </p>
                    {data.benchmarkV1.overallSummary ? (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">
                        {data.benchmarkV1.overallSummary}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-[var(--color-surface-cream)] p-4">
                      <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">SEO</p>
                      <p className="mt-1 font-head text-3xl font-semibold text-[var(--color-primary)]">
                        {data.benchmarkV1.seo.score}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--color-surface-cream)] p-4">
                      <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Website</p>
                      <p className="mt-1 font-head text-3xl font-semibold text-[var(--color-primary)]">
                        {data.benchmarkV1.websiteExperience.score}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--color-surface-cream)] p-4">
                      <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Brand & social</p>
                      <p className="mt-1 font-head text-3xl font-semibold text-[var(--color-primary)]">
                        {data.benchmarkV1.brandSocialPresence.score}
                      </p>
                    </div>
                  </div>
                  <BenchmarkSectionCard title="SEO & discoverability" section={data.benchmarkV1.seo} />
                  <BenchmarkSectionCard title="Website experience" section={data.benchmarkV1.websiteExperience} />
                  <BenchmarkSectionCard
                    title="Brand & social presence"
                    section={data.benchmarkV1.brandSocialPresence}
                  />
                </section>
              ) : unlocked && data.benchmarkV1Status === "pending" ? (
                <div className="mb-8 rounded-2xl border border-[#2c2c2c]/8 bg-[#f9f6f1] px-5 py-4">
                  <p className="text-sm text-[#2c2c2c]/70">
                    Benchmark scores are still processing in the background.
                  </p>
                  {timedOut ? (
                    <button
                      type="button"
                      onClick={() => {
                        void retryAnalysis();
                      }}
                      disabled={retrying}
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-[var(--color-forest)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)] disabled:opacity-60"
                    >
                      {retrying ? "Retrying…" : "Retry analysis"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {showMedia && data.benchmarkV1Media && activeNav === "technical" ? (
                <section className="mb-8 space-y-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
                  <h2 className="font-head text-lg font-semibold">Photography & visual design</h2>
                  {data.benchmarkV1Media.visualSummary ? (
                    <p className="text-sm text-[var(--color-muted)]">{data.benchmarkV1Media.visualSummary}</p>
                  ) : null}
                  {mediaThumbs.length ? (
                    <ul className="flex flex-wrap gap-3">
                      {mediaThumbs.slice(0, 6).map((m) => (
                        <li
                          key={m.ref}
                          className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- third-party audit URLs */}
                          <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <BenchmarkSectionCard
                    title="Visual brand quality"
                    section={data.benchmarkV1Media.visualBrandQuality}
                  />
                </section>
              ) : null}

              {showVideo && data.benchmarkV1Media?.videoPresentationQuality && activeNav === "technical" ? (
                <section className="mb-8 space-y-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-sm">
                  <h2 className="font-head text-lg font-semibold">Video & motion</h2>
                  <p className="text-xs text-[var(--color-muted-medium)]">
                    Based on video poster frames and page markup — not a full video transcode.
                  </p>
                  {data.benchmarkV1Media.videoSummary ? (
                    <p className="text-sm text-[var(--color-muted)]">{data.benchmarkV1Media.videoSummary}</p>
                  ) : null}
                  <BenchmarkSectionCard
                    title="Video presentation"
                    section={data.benchmarkV1Media.videoPresentationQuality}
                  />
                </section>
              ) : null}
            </div>

            {!unlocked ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 top-24 bg-gradient-to-t from-[var(--color-surface-warm)] via-[var(--color-surface-warm)]/80 to-transparent" />
            ) : null}
          </main>

          {unlocked ? (
            <div className="border-t border-[var(--color-hairline)] bg-white px-6 py-10 md:px-10">
              <AuditUpgradePanel
                auditId={audit.id}
                restaurantName={restaurantDisplay}
                leadEmail={audit.leadEmail}
                primaryHref={trialCheckoutHref}
              />
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
