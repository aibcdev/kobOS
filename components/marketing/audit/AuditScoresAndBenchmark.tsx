"use client";

import { useAuditBenchmarkPoll } from "@/components/marketing/audit/use-audit-benchmark-poll";
import type { AuditBenchmarkPollSnapshot } from "@/components/marketing/audit/use-audit-benchmark-poll";
import { isAuditScoresReady } from "@/lib/audit/audit-score-display";
import type { BenchmarkV1Section } from "@/lib/audit/types";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-[#2c2c2c]">
        <span>{label}</span>
        <span className="font-semibold text-[#094413]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#2c2c2c]/10">
        <div
          className="h-full rounded-full bg-[#094413] transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  section,
}: {
  title: string;
  section: BenchmarkV1Section;
}) {
  return (
    <div className="rounded-2xl border border-[#2c2c2c]/10 bg-[#f9f3ed]/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#2c2c2c]">{title}</h3>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums text-[#094413]">{section.score}</p>
          <p className="text-xs uppercase text-[#666666]">Confidence: {section.confidence}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {section.checks.slice(0, 6).map((c) => (
          <li key={c.id} className="text-sm text-[#2c2c2c]">
            <span className={c.pass ? "text-[#094413]" : "text-amber-800"}>{c.pass ? "✓" : "○"}</span>{" "}
            <span className="font-medium">{c.id.replace(/_/g, " ")}</span>
            <span className="text-[#666666]"> — {c.detail}</span>
            <span className="block pl-4 text-xs text-[#999999]">Ref: {c.evidenceRef}</span>
          </li>
        ))}
      </ul>
      {section.topGaps.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-[#666666]">Gaps</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[#2c2c2c]">
            {section.topGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {section.nextActions.length ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-[#666666]">Next actions</p>
          <ul className="mt-1 list-inside list-disc text-sm text-[#094413]">
            {section.nextActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AuditScoresAndBenchmark({
  auditId,
  initial,
  unlocked = true,
}: {
  auditId: string;
  initial: AuditBenchmarkPollSnapshot;
  unlocked?: boolean;
}) {
  const { data } = useAuditBenchmarkPoll(auditId, initial, { enabled: unlocked });
  const scoresReady = isAuditScoresReady({
    scoresPending: data.scoresPending,
    scanStatus: data.scanStatus,
  });
  const pendingText = data.benchmarkV1Status === "pending";
  const pendingMedia = data.benchmarkV1MediaStatus === "pending";
  const pendingScan = data.scanStatus === "pending";
  const pending = !scoresReady || pendingText || pendingMedia || pendingScan;
  const failed = data.benchmarkV1Status === "failed";
  const ready = data.benchmarkV1Status === "ready" && data.benchmarkV1;
  const mediaReady = data.benchmarkV1MediaStatus === "ready" && data.benchmarkV1Media;
  const mediaFailed = data.benchmarkV1MediaStatus === "failed";
  const mediaSkipped = data.benchmarkV1MediaStatus === "skipped";
  const meta = data.evidencePack?.mediaAssetsMeta;
  const cands = data.evidencePack?.imageCandidates ?? [];
  const thumbs = meta && meta.length > 0 ? meta : cands;

  const showScores = unlocked && scoresReady;
  const showBenchmark = unlocked && ready && data.benchmarkV1;
  const showMedia = unlocked && mediaReady && data.benchmarkV1Media;

  return (
    <>
      <div className="mt-12 rounded-3xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-8 shadow-[0_24px_48px_-12px_rgba(9,68,19,0.08)]">
        <p className="text-sm font-medium text-[var(--color-muted)]">Overall visibility score</p>
        {!unlocked ? (
          <div className="mt-4 space-y-3">
            <div className="h-16 w-28 rounded-2xl bg-[var(--color-muted-faint)]" aria-hidden />
            <p className="text-sm text-[var(--color-muted)]">Unlock with your mobile number to see your score.</p>
          </div>
        ) : scoresReady ? (
          <p
            className="mt-2 text-6xl font-semibold tracking-tight text-[var(--color-primary)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {data.overallScore}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="h-16 w-32 animate-pulse rounded-2xl bg-[#2c2c2c]/10" aria-hidden />
            <p className="text-sm text-[#666666]">Analyzing your site — scores appear when the scan finishes.</p>
          </div>
        )}
        {pending && scoresReady ? (
          <p className="mt-2 text-sm text-[#666666]">
            {pendingText || pendingMedia
              ? `Refining with AI benchmark${pendingMedia ? " + image review" : ""}… `
              : ""}
            Numbers may tick up as analysis completes.
          </p>
        ) : null}
        {pending && !scoresReady ? (
          <p className="mt-2 text-sm text-[#666666]">
            {pendingScan ? "Live browser scan in progress… " : "Building your evidence pack… "}
            This usually takes under a minute.
          </p>
        ) : null}
        {failed && data.benchmarkV1Error ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Benchmark unavailable: {data.benchmarkV1Error}
          </p>
        ) : null}
        {showScores ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ScoreBar label="SEO" value={data.seoScore} />
            <ScoreBar label="Design / experience" value={data.designScore} />
            <ScoreBar label="Mobile" value={data.mobileScore} />
            <ScoreBar label="Conversion" value={data.conversionScore} />
          </div>
        ) : unlocked && !scoresReady ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-muted-faint)]" />
            ))}
          </div>
        ) : null}
      </div>

      {showBenchmark && data.benchmarkV1 ? (
        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold text-[#2c2c2c]">Absolute benchmark (elite bar)</h2>
          <p className="text-sm text-[#666666]">
            Each pillar is scored 0–100 against global leaders, not &ldquo;typical local&rdquo; peers. Evidence-backed
            checks below.
          </p>
          {data.benchmarkV1.overallSummary ? (
            <p className="text-sm leading-relaxed text-[#2c2c2c]">{data.benchmarkV1.overallSummary}</p>
          ) : null}
          {data.benchmarkV1.anchorCalibrationNote ? (
            <p className="text-xs text-[#666666]">{data.benchmarkV1.anchorCalibrationNote}</p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-1">
            <SectionCard title="SEO (absolute)" section={data.benchmarkV1.seo} />
            <SectionCard title="Website experience" section={data.benchmarkV1.websiteExperience} />
            <SectionCard title="Brand & social presence" section={data.benchmarkV1.brandSocialPresence} />
          </div>
          <p className="text-xs text-[#999999]">Model: {data.benchmarkV1.model}</p>
        </section>
      ) : null}

      {thumbs.length > 0 && (pending || ready || mediaFailed || mediaReady) ? (
        <section className="mt-10">
          <h3 className="text-sm font-semibold text-[#2c2c2c]">Images reviewed</h3>
          <p className="mt-1 text-xs text-[#666666]">
            Public URLs from your site (og:image, hero images, posters) plus any sample URLs you provided.
            {pendingMedia ? " Vision scoring in progress…" : ""}
          </p>
          <ul className="mt-3 flex flex-wrap gap-3">
            {thumbs.map((m) => (
              <li
                key={m.ref}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-[#2c2c2c]/10 bg-[#f9f3ed]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic third-party audit URLs */}
                <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showMedia && data.benchmarkV1Media ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-[#2c2c2c]">Visual brand quality (Gemini vision)</h2>
          {data.benchmarkV1Media.visualSummary ? (
            <p className="text-sm leading-relaxed text-[#2c2c2c]">{data.benchmarkV1Media.visualSummary}</p>
          ) : null}
          <SectionCard title="Photography & visual execution" section={data.benchmarkV1Media.visualBrandQuality} />
          <p className="text-xs text-[#999999]">Vision model: {data.benchmarkV1Media.model}</p>
        </section>
      ) : null}

      {mediaFailed && data.benchmarkV1MediaError ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Visual analysis unavailable: {data.benchmarkV1MediaError}
        </p>
      ) : null}

      {data.benchmarkV1Status === "ready" && mediaSkipped && thumbs.length === 0 ? (
        <p className="mt-6 text-xs text-[#666666]">
          No public images were detected on the page for automatic vision scoring. Add sample image URLs in the audit
          form to include visuals next time.
        </p>
      ) : null}
    </>
  );
}
