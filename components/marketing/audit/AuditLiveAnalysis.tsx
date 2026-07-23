"use client";

import { SaasIcon } from "@/components/marketing/saas/SaasIcon";
import { SaasLogoWall } from "@/components/marketing/saas/SaasLogoWall";
import { ANALYSIS_STEP_LABELS } from "@/lib/audit/analysis-progress";
import type { AnalysisProgressV1, AnalysisStepId, AnalysisStepStatus } from "@/lib/audit/types";
import type { AuditScanPreview } from "@/lib/marketing/audit-scan-preview";

const STEP_ICONS: Record<AnalysisStepId, string> = {
  website: "solar:global-linear",
  reviews: "solar:star-linear",
  local: "solar:map-point-linear",
  competitors: "solar:users-group-rounded-linear",
  technical: "solar:shield-check-linear",
};

const STEP_BLURBS: Record<AnalysisStepId, string> = {
  website: "Checking design, content and mobile experience",
  reviews: "Checking sentiment and recent activity",
  local: "Checking Google listing, hours and photos",
  competitors: "Comparing with similar restaurants nearby",
  technical: "Checking speed, SEO and mobile performance",
};

const STEP_TITLES: Record<AnalysisStepId, string> = {
  website: "Scanning website",
  reviews: "Analysing reviews",
  local: "Reviewing local presence",
  competitors: "Checking competitors",
  technical: "Technical & performance",
};

const DEMO_PROGRESS: AnalysisProgressV1 = {
  status: "running",
  percent: 45,
  currentStep: ANALYSIS_STEP_LABELS.website,
  steps: [
    { id: "website", status: "running", detail: STEP_BLURBS.website },
    { id: "reviews", status: "pending", detail: STEP_BLURBS.reviews },
    { id: "local", status: "pending", detail: STEP_BLURBS.local },
    { id: "competitors", status: "pending", detail: STEP_BLURBS.competitors },
    { id: "technical", status: "pending", detail: STEP_BLURBS.technical },
  ],
};

function StatusPill({ status }: { status: AnalysisStepStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex rounded-full bg-[var(--color-forest-mid)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-forest-mid)]">
        Done
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex rounded-full bg-[var(--color-forest-mid)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-forest-mid)]">
        In progress
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex rounded-full bg-[#f5e6d3] px-2.5 py-0.5 text-[11px] font-semibold text-[#9a6b3a]">
        Limited
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#f5e6d3] px-2.5 py-0.5 text-[11px] font-semibold text-[#9a6b3a]">
      Pending
    </span>
  );
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
    state === "great" ? "Good" : state === "weak" ? "Needs work" : state === "checking" ? "Checking…" : "Pending";
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#2c2c2c]/75">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
        {state === "great" ? <SaasIcon icon="solar:check-circle-bold" /> : null}
        {state !== "great" ? (
          <span className="inline-block h-3.5 w-3.5 rounded-full border border-current opacity-40" />
        ) : null}
        {text}
      </span>
    </li>
  );
}

export function AuditLiveAnalysis({
  mode = "live",
  restaurantName = "Your restaurant",
  websiteHost = "",
  city = "",
  progress,
  preview,
  previewImageUrl,
  showChrome = true,
  showLogoWall = false,
}: {
  mode?: "demo" | "live";
  restaurantName?: string;
  websiteHost?: string;
  city?: string;
  progress?: AnalysisProgressV1 | null;
  preview?: AuditScanPreview | null;
  previewImageUrl?: string | null;
  showChrome?: boolean;
  showLogoWall?: boolean;
}) {
  const isDemo = mode === "demo";
  const active = isDemo ? DEMO_PROGRESS : (progress ?? DEMO_PROGRESS);
  const percent = active.percent ?? (isDemo ? 45 : 8);
  const steps = active.steps?.length
    ? active.steps
    : (Object.keys(STEP_TITLES) as AnalysisStepId[]).map((id) => ({
        id,
        status: "pending" as const,
        detail: STEP_BLURBS[id],
      }));

  const hostLabel = websiteHost || (isDemo ? "kfc.com" : restaurantName) || "your site";
  const snapImage =
    previewImageUrl ??
    (isDemo
      ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
      : null);

  const seo = preview?.seoChecks;
  const heroState: "great" | "checking" | "weak" | "pending" = isDemo
    ? "great"
    : preview?.scanSignals.hasHeroImage
      ? "great"
      : steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : steps.find((s) => s.id === "website")?.status === "done"
          ? "weak"
          : "pending";
  const menuState: "great" | "checking" | "weak" | "pending" = isDemo
    ? "checking"
    : seo?.h1 || seo?.schema
      ? "great"
      : steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : steps.find((s) => s.id === "website")?.status === "done"
          ? "weak"
          : "pending";
  const ctaState: "great" | "checking" | "weak" | "pending" = isDemo
    ? "checking"
    : steps.find((s) => s.id === "website")?.status === "done"
      ? seo?.title
        ? "great"
        : "weak"
      : steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : "pending";
  const mobileState: "great" | "checking" | "weak" | "pending" = isDemo
    ? "checking"
    : steps.find((s) => s.id === "technical")?.status === "done"
      ? "great"
      : steps.find((s) => s.id === "technical")?.status === "running" ||
          steps.find((s) => s.id === "website")?.status === "running"
        ? "checking"
        : "pending";

  const panel = (
    <div className="mx-auto max-w-[83rem] px-6">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[1.5rem] border border-[#2c2c2c]/8 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#1a1a1a] sm:text-xl">
              Your free scan is in progress
            </h2>
            <p className="text-sm text-[#2c2c2c]/55">Taking about 60 seconds</p>
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#ebe6df]">
            <div
              className="h-full rounded-full bg-[var(--color-forest)] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
            />
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <div key={step.id} className="min-w-0">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    step.status === "running"
                      ? "bg-[var(--color-forest)]/12 text-[var(--color-forest)]"
                      : step.status === "done"
                        ? "bg-[var(--color-bright-green)]/35 text-[var(--color-forest)]"
                        : "bg-[#f0ebe3] text-[#2c2c2c]/45"
                  }`}
                >
                  <SaasIcon icon={STEP_ICONS[step.id]} className="text-xl" />
                </div>
                <p className="text-sm font-semibold text-[#1a1a1a]">{STEP_TITLES[step.id]}</p>
                <div className="mt-2">
                  <StatusPill status={step.status} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#2c2c2c]/55">
                  {step.detail ?? STEP_BLURBS[step.id]}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-[#2c2c2c]/55">
            <SaasIcon icon="solar:bell-linear" className="text-[var(--color-forest-mid)]" />
            We&apos;ll notify you as soon as your report is ready.
          </p>
        </div>

        <aside className="rounded-[1.5rem] border border-[#2c2c2c]/8 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono-brand text-[10px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
              Live snapshot
            </p>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-forest-mid)] uppercase">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-forest-mid)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-forest-mid)]" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-[#2c2c2c]/55">{hostLabel} homepage</p>
          {city && !isDemo ? <p className="text-xs text-[#2c2c2c]/40">{city}</p> : null}

          <div className="mt-4 overflow-hidden rounded-xl bg-[#f0ebe3]">
            {snapImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapImage} alt="" className="aspect-[16/10] w-full object-cover object-top" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-xs text-[#2c2c2c]/40">
                Capturing homepage…
              </div>
            )}
          </div>

          <ul className="mt-5 space-y-3">
            <LiveCheck label="Hero image" state={heroState} />
            <LiveCheck label="Menu visibility" state={menuState} />
            <LiveCheck label="Call to action" state={ctaState} />
            <LiveCheck label="Mobile experience" state={mobileState} />
          </ul>
        </aside>
      </div>

      {showLogoWall ? <SaasLogoWall className="mt-10 md:mt-14" /> : null}
    </div>
  );

  if (!showChrome) {
    return <section className="bg-[#f9f6f1] py-4 md:py-6">{panel}</section>;
  }

  return (
    <div className="min-h-screen bg-[#f9f6f1] text-[#1a1a1a]">
      <div className="border-b border-[#2c2c2c]/5 bg-[#f9f6f1]/90 px-6 py-4">
        <div className="mx-auto flex max-w-[83rem] items-center justify-between">
          <p className="font-heading text-xl text-[var(--color-forest)]">KOB</p>
          <p className="text-sm text-[#2c2c2c]/55">Scanning {restaurantName}…</p>
        </div>
      </div>
      <div className="py-6 md:py-8">{panel}</div>
    </div>
  );
}
