"use client";

import Link from "next/link";

import { AuditFunnelHeader } from "@/components/marketing/audit/AuditFunnelHeader";
import { SaasIcon } from "@/components/marketing/saas/SaasIcon";
import {
  ANALYSIS_STEP_LABELS,
} from "@/lib/audit/analysis-progress";
import type { AnalysisProgressV1, AnalysisStepId } from "@/lib/audit/types";
import type { AuditScanPreview } from "@/lib/marketing/audit-scan-preview";

const STEP_ICONS: Record<AnalysisStepId, string> = {
  website: "solar:global-linear",
  reviews: "solar:star-linear",
  local: "solar:map-point-linear",
  competitors: "solar:users-group-rounded-linear",
  technical: "solar:shield-check-linear",
};

function StepStatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-forest-mid)]">
        <SaasIcon icon="solar:check-circle-bold" className="text-sm" />
        Done
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-forest)]">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-forest)] border-t-transparent" />
        In progress
      </span>
    );
  }
  if (status === "failed") {
    return <span className="text-xs font-semibold text-[#b45309]">Limited data</span>;
  }
  return <span className="text-xs font-medium text-[#2c2c2c]/45">Pending</span>;
}

function LiveCheck({
  label,
  state,
}: {
  label: string;
  state: "great" | "checking" | "weak" | "pending";
}) {
  const color =
    state === "great"
      ? "text-[var(--color-forest-mid)]"
      : state === "weak"
        ? "text-[#b45309]"
        : "text-[#2c2c2c]/40";
  const text =
    state === "great" ? "Great" : state === "weak" ? "Needs work" : state === "checking" ? "Checking…" : "Pending";
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#2c2c2c]/75">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        {state === "great" ? <SaasIcon icon="solar:check-circle-bold" /> : null}
        {text}
      </span>
    </li>
  );
}

export function AuditLiveAnalysis({
  restaurantName,
  websiteHost,
  city,
  progress,
  preview,
  previewImageUrl,
}: {
  restaurantName: string;
  websiteHost: string;
  city: string;
  progress: AnalysisProgressV1 | null;
  preview: AuditScanPreview | null | undefined;
  previewImageUrl: string | null;
}) {
  const percent = progress?.percent ?? 8;
  const steps = progress?.steps ?? [];
  const seo = preview?.seoChecks;

  const heroState: "great" | "checking" | "weak" | "pending" = preview?.scanSignals.hasHeroImage
    ? "great"
    : steps.find((s) => s.id === "website")?.status === "running"
      ? "checking"
      : steps.find((s) => s.id === "website")?.status === "done"
        ? "weak"
        : "pending";
  const menuState: "great" | "checking" | "weak" | "pending" =
    seo?.h1 || seo?.schema
      ? "great"
      : steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : steps.find((s) => s.id === "website")?.status === "done"
          ? "weak"
          : "pending";
  const ctaState: "great" | "checking" | "weak" | "pending" =
    steps.find((s) => s.id === "website")?.status === "done"
      ? seo?.title
        ? "great"
        : "weak"
      : steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : "pending";
  const mobileState: "great" | "checking" | "weak" | "pending" =
    steps.find((s) => s.id === "technical")?.status === "done"
      ? "great"
      : steps.find((s) => s.id === "technical")?.status === "running" ||
          steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : "pending";

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#1a1a1a]">
      <AuditFunnelHeader showTrialCta ctaHref="/#audit-form" ctaLabel="Start 7-day free trial" />

      <div className="mx-auto flex max-w-[90rem] gap-0">
        {/* Left rail */}
        <aside className="hidden w-56 shrink-0 border-r border-[#2c2c2c]/8 bg-[#f9f6f1] px-4 py-8 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-forest)] text-xs font-bold text-white">
              K
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">KOB</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-forest-mid)]">
                AI Report
              </p>
            </div>
          </div>
          <nav className="space-y-1 text-sm" aria-label="Report sections">
            {["Overview", "Reviews & Social", "Local discovery", "Competitors", "Technical detail"].map(
              (label, i) => (
                <div
                  key={label}
                  className={`rounded-xl px-3 py-2.5 ${
                    i === 0
                      ? "bg-white font-medium text-[var(--color-forest)] shadow-sm"
                      : "text-[#2c2c2c]/40"
                  }`}
                >
                  {label}
                </div>
              ),
            )}
          </nav>

          <div className="mt-auto rounded-2xl bg-[var(--color-forest)] p-4 text-white">
            <p className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Your daily helper
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              We&apos;re checking what guests see before they visit. This takes about 60 seconds.
            </p>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${percent > i * 25 ? "bg-[var(--color-bright-green)]" : "bg-white/25"}`}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 text-xs text-white/75">
              <li className="flex items-center gap-1.5">
                <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-bright-green)]" />
                No card required
              </li>
              <li className="flex items-center gap-1.5">
                <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-bright-green)]" />
                Cancel anytime
              </li>
            </ul>
          </div>
          <Link
            href="/demo"
            className="mt-4 flex items-center gap-2 px-2 text-xs text-[#2c2c2c]/50 hover:text-[var(--color-forest)]"
          >
            <SaasIcon icon="solar:chat-round-line-linear" />
            Questions?
          </Link>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2c2c2c]/10 bg-white px-3 py-1.5 text-sm shadow-sm">
              <span className="font-medium">{websiteHost || restaurantName}</span>
              <span className="text-[#2c2c2c]/45">·</span>
              <span className="text-[#2c2c2c]/55">{city || "Your area"}</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full bg-[var(--color-forest)]/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--color-forest)] uppercase">
                Step 1 of 3
              </span>
              <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight text-[#1a1a1a] md:text-4xl">
                Analysing how guests perceive {restaurantName} online…
              </h1>
              <p className="mt-3 text-sm text-[#2c2c2c]/65 md:text-base">
                We&apos;re checking your website, reviews and local presence.
              </p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e8e4dc]">
                <div
                  className="h-full rounded-full bg-[var(--color-forest)] transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#2c2c2c]/45">{percent}% · {progress?.currentStep ?? "Starting…"}</p>

              <ul className="mt-8 space-y-3">
                {(steps.length
                  ? steps
                  : (Object.keys(ANALYSIS_STEP_LABELS) as AnalysisStepId[]).map((id) => ({
                      id,
                      status: "pending" as const,
                      detail: undefined,
                    }))
                ).map((step) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-3 rounded-2xl border border-[#2c2c2c]/8 bg-white px-4 py-3.5 shadow-sm"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        step.status === "running"
                          ? "bg-[var(--color-forest)]/15 text-[var(--color-forest)]"
                          : step.status === "done"
                            ? "bg-[var(--color-bright-green)]/30 text-[var(--color-forest)]"
                            : "bg-[#f0ebe3] text-[#2c2c2c]/45"
                      }`}
                    >
                      <SaasIcon icon={STEP_ICONS[step.id]} className="text-lg" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1a1a1a]">
                          {ANALYSIS_STEP_LABELS[step.id]}
                        </p>
                        <StepStatusBadge status={step.status} />
                      </div>
                      {step.detail ? (
                        <p className="mt-1 text-xs leading-relaxed text-[#2c2c2c]/55">{step.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <details className="mt-8 rounded-2xl border border-[#2c2c2c]/8 bg-white px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[#1a1a1a]">
                  Why does this matter?
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/65">
                  Most guests make up their mind before they visit. We show you exactly what they see—then a clear list
                  of what to fix.
                </p>
              </details>
            </div>

            {/* Right live panel */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2c2c2c]/8 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-forest-mid)] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-forest)]" />
                  </span>
                  <p className="font-mono-brand text-[10px] font-semibold tracking-wider text-[var(--color-forest)] uppercase">
                    Live analysis
                  </p>
                </div>
                <p className="mt-1 text-sm text-[#2c2c2c]/55">{progress?.currentStep ?? "Scanning your homepage"}</p>

                <div className="mt-4 overflow-hidden rounded-xl bg-[#ebe6df]">
                  {previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImageUrl}
                      alt={`Preview of ${restaurantName}`}
                      className="aspect-[16/10] w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center text-xs text-[#2c2c2c]/40">
                      Capturing homepage preview…
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-2.5 border-t border-[#2c2c2c]/6 pt-4">
                  <LiveCheck label="Hero image" state={heroState} />
                  <LiveCheck label="Menu visibility" state={menuState} />
                  <LiveCheck label="Call to action" state={ctaState} />
                  <LiveCheck label="Mobile experience" state={mobileState} />
                </ul>
              </div>

              <div className="rounded-2xl border border-[#2c2c2c]/8 bg-[#f9f6f1] p-5">
                <p className="font-mono-brand text-[10px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                  What we look for
                </p>
                <ul className="mt-3 space-y-3 text-sm text-[#2c2c2c]/70">
                  <li>
                    <span className="font-semibold text-[#1a1a1a]">First impressions</span>
                    <p className="text-xs text-[#2c2c2c]/55">Does the hero feel as good as the room?</p>
                  </li>
                  <li>
                    <span className="font-semibold text-[#1a1a1a]">Information</span>
                    <p className="text-xs text-[#2c2c2c]/55">Can guests find menu, hours, and how to book?</p>
                  </li>
                  <li>
                    <span className="font-semibold text-[#1a1a1a]">Trust signals</span>
                    <p className="text-xs text-[#2c2c2c]/55">Reviews, photos, and a complete Google listing.</p>
                  </li>
                  <li>
                    <span className="font-semibold text-[#1a1a1a]">Experience</span>
                    <p className="text-xs text-[#2c2c2c]/55">Mobile speed and a clear path to order or reserve.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
