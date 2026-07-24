"use client";

import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";
import type { AuditResultPayload, PerceptionAuditV1 } from "@/lib/audit/types";
import { onlineHealthLabel } from "@/lib/marketing/audit-grader-phases";

function scoreTone(score: number) {
  if (score < 45) return { stroke: "#ea580c", text: "text-[#ea580c]", label: "Critical gap" };
  if (score < 65) return { stroke: "#d97706", text: "text-[#d97706]", label: "Needs attention" };
  return { stroke: "var(--color-accent)", text: "text-[var(--color-accent)]", label: "Strong foundation" };
}

function ScoreRing({ score }: { score: number }) {
  const size = 96;
  const tone = scoreTone(score);
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-head text-3xl font-semibold tabular-nums ${tone.text}`}>{score}</span>
      </div>
    </div>
  );
}

export function AuditPerceptionHero({
  perception,
  pending,
  timedOut,
  retrying,
  onRetry,
  restaurantName,
  payload,
}: {
  perception: PerceptionAuditV1 | null;
  pending?: boolean;
  timedOut?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
  restaurantName: string;
  payload?: AuditResultPayload;
}) {
  if (pending && !perception) {
    return (
      <div className="rounded-2xl border border-[#2c2c2c]/8 bg-[#f9f6f1] p-8">
        <div className="flex items-start gap-4">
          <div
            className="mt-1 h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--color-forest)]/15"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-forest-mid)]">
              Scoring digital positioning
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/70">
              {timedOut
                ? `Still working on how guests see ${restaurantName} online. You can retry analysis now.`
                : `Building a clear summary of how guests perceive ${restaurantName} online…`}
            </p>
            {timedOut && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-forest)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)] disabled:opacity-60"
              >
                {retrying ? "Retrying…" : "Retry analysis"}
              </button>
            ) : (
              <p className="mt-3 text-xs text-[#2c2c2c]/45">Usually ready in under a minute.</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (!perception) return null;

  const hero =
    perception.ownerHero ?? (payload ? buildOwnerHeroFallback(payload, perception) : null);
  const tone = scoreTone(perception.digitalPositioningScore);
  const healthLabel = onlineHealthLabel(perception.digitalPositioningScore);
  const headline =
    perception.coverHeadline ?? "Your digital experience is likely underselling your restaurant.";
  const sub =
    perception.coverSubheadline ??
    "We reviewed mobile UX, menu structure, imagery, local discovery, and conversion.";

  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-gradient-to-br from-[var(--color-surface-cream)] to-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        Hospitality perception report
      </p>
      <h1 className="mt-2 font-head text-xl font-semibold leading-snug text-[var(--color-ink)] sm:text-2xl">
        {headline}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{sub}</p>

      {hero ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-medium)]">
              What you may be losing
            </p>
            <p className="mt-2 font-head text-lg font-semibold text-[var(--color-ink)]">{hero.revenueHeadline}</p>
            <p className="mt-3 font-head text-2xl font-semibold tabular-nums text-[#ea580c]">
              {hero.bookingLeakPercentLow}–{hero.bookingLeakPercentHigh}%
              <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">of high-intent bookings</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{hero.revenueDetail}</p>
            <ul className="mt-4 space-y-1.5">
              {hero.customerLossBullets.map((bullet, idx) => (
                <li key={`loss-${idx}`} className="flex gap-2 text-sm text-[var(--color-ink)]">
                  <span className="text-[#ea580c]" aria-hidden>
                    ·
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-medium)]">
              When you&apos;ll see change
            </p>
            <p className="mt-2 font-head text-lg font-semibold text-[var(--color-ink)]">{hero.timelineHeadline}</p>
            <ul className="mt-4 space-y-3">
              {hero.timelinePhases.map((phase, idx) => (
                <li key={`phase-${idx}`} className="border-l-2 border-[var(--color-accent)] pl-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    {phase.window}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{phase.outcome}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-start gap-4 border-t border-[var(--color-hairline)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-muted-medium)]">
            {hero?.comparedToLabel ??
              (perception.benchmarkAnchors.length
                ? `Peer benchmark: ${perception.benchmarkAnchors.slice(0, 2).join(" · ")}`
                : "Peer benchmark: regional multi-site operators")}
          </p>
          {perception.benchmarkAnchors.length ? (
            <p className="mt-1 text-[10px] text-[var(--color-muted-medium)]">
              {perception.benchmarkAnchors.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Digital positioning
            </p>
            <p className={`text-sm font-semibold ${tone.text}`}>{healthLabel}</p>
          </div>
          <ScoreRing score={perception.digitalPositioningScore} />
        </div>
      </div>
    </div>
  );
}
