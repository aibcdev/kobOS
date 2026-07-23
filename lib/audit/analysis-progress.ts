import type { Prisma } from "@prisma/client";

import { applyRestaurantScoresToPayload } from "@/lib/audit/restaurant-scoring";
import {
  parseAuditPayload,
  type AnalysisProgressV1,
  type AnalysisStepId,
  type AnalysisStepStatus,
  type AuditResultPayload,
} from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

export const ANALYSIS_STEP_ORDER: AnalysisStepId[] = [
  "website",
  "reviews",
  "local",
  "competitors",
  "technical",
];

export const ANALYSIS_STEP_LABELS: Record<AnalysisStepId, string> = {
  website: "Scanning your website",
  reviews: "Analysing reviews",
  local: "Reviewing local presence",
  competitors: "Checking competitors",
  technical: "Technical & performance",
};

export function createInitialAnalysisProgress(): AnalysisProgressV1 {
  return {
    status: "queued",
    percent: 0,
    currentStep: "Queued",
    steps: ANALYSIS_STEP_ORDER.map((id) => ({
      id,
      status: "pending" as const,
      detail:
        id === "website"
          ? "Looking at design, content, menus and mobile experience..."
          : id === "reviews"
            ? "Checking sentiment, response rate and recent activity."
            : id === "local"
              ? "Checking your Google listing, hours, photos and categories."
              : id === "competitors"
                ? "Seeing how you compare to similar restaurants nearby."
                : "Checking site speed, SEO basics and mobile performance.",
    })),
  };
}

function recomputePercent(steps: AnalysisProgressV1["steps"]): number {
  const weight = 100 / Math.max(1, steps.length);
  let pct = 0;
  for (const s of steps) {
    if (s.status === "done") pct += weight;
    else if (s.status === "running") pct += weight * 0.45;
    else if (s.status === "failed") pct += weight * 0.35;
  }
  return Math.min(100, Math.round(pct));
}

function currentStepLabel(progress: AnalysisProgressV1): string {
  const running = progress.steps.find((s) => s.status === "running");
  if (running) return ANALYSIS_STEP_LABELS[running.id];
  const pending = progress.steps.find((s) => s.status === "pending");
  if (pending) return ANALYSIS_STEP_LABELS[pending.id];
  if (progress.steps.every((s) => s.status === "done" || s.status === "failed")) {
    return "Analysis complete";
  }
  return progress.currentStep;
}

export function withStepUpdate(
  payload: AuditResultPayload,
  stepId: AnalysisStepId,
  status: AnalysisStepStatus,
  detail?: string,
): AuditResultPayload {
  const base = payload.analysisProgress ?? createInitialAnalysisProgress();
  const steps = base.steps.map((s) =>
    s.id === stepId
      ? {
          ...s,
          status,
          ...(detail !== undefined ? { detail } : {}),
        }
      : s,
  );

  // When one step starts running, leave others as-is
  let progress: AnalysisProgressV1 = {
    ...base,
    status: "running",
    steps,
    percent: recomputePercent(steps),
    currentStep: "",
  };
  progress.currentStep = currentStepLabel(progress);

  const allTerminal = steps.every((s) => s.status === "done" || s.status === "failed");
  if (allTerminal) {
    progress = {
      ...progress,
      status: steps.some((s) => s.status === "failed") && steps.every((s) => s.status === "failed")
        ? "failed"
        : "completed",
      percent: 100,
      currentStep: "Analysis complete",
    };
  }

  let next: AuditResultPayload = { ...payload, analysisProgress: progress };

  // Score once we have at least website or local done (enough for a first grade)
  const readyEnough =
    steps.some((s) => s.id === "website" && (s.status === "done" || s.status === "failed")) ||
    steps.some((s) => s.id === "local" && s.status === "done");
  if (readyEnough || allTerminal) {
    next = applyRestaurantScoresToPayload(next);
  }

  return next;
}

/** Derive step completions from payload signals (idempotent). */
export function syncAnalysisProgressFromPayload(payload: AuditResultPayload): AuditResultPayload {
  let next = payload;
  const pack = payload.evidencePack;

  if (pack?.urlSignals?.fetched || payload.scanStatus === "ready") {
    next = withStepUpdate(
      next,
      "website",
      pack?.urlSignals?.fetched === false ? "failed" : "done",
      pack?.urlSignals?.fetched
        ? "Homepage design, menu signals and CTAs reviewed."
        : "Website fetch incomplete — scored from available signals.",
    );
  } else if (payload.scanStatus === "pending") {
    next = withStepUpdate(next, "website", "running", "Looking at design, content, menus and mobile experience...");
  }

  const gp = pack?.googlePlace;
  if (gp?.placeId) {
    next = withStepUpdate(
      next,
      "local",
      "done",
      `Google listing found · ${gp.photoCount || 0} photos · ${gp.reviewCount ?? 0} reviews`,
    );
    next = withStepUpdate(
      next,
      "reviews",
      (gp.reviewCount ?? 0) > 0 || (gp.reviews?.length ?? 0) > 0 ? "done" : "done",
      (gp.reviewCount ?? 0) > 0
        ? `Rating ${gp.rating ?? "—"} · ${gp.reviewCount} reviews`
        : "Listing found; limited review sample.",
    );
  } else if (payload.scanStatus === "ready") {
    next = withStepUpdate(next, "local", "failed", "Google listing not resolved for this scan.");
    next = withStepUpdate(next, "reviews", "failed", "Reviews unavailable without a Google listing.");
  }

  if (payload.competitors.some((c) => c.source === "places") || payload.competitors.length >= 3) {
    next = withStepUpdate(
      next,
      "competitors",
      "done",
      `Compared against ${payload.competitors.length} nearby restaurants.`,
    );
  } else if (payload.scanStatus === "ready") {
    next = withStepUpdate(next, "competitors", "done", "Limited competitor set — used market estimates.");
  }

  if (pack?.pageSpeed && !pack.pageSpeed.error) {
    next = withStepUpdate(
      next,
      "technical",
      "done",
      pack.pageSpeed.performanceScore != null
        ? `Mobile performance ${pack.pageSpeed.performanceScore}/100`
        : "Technical SEO and security signals checked.",
    );
  } else if (pack?.urlSignals?.fetched || payload.scanStatus === "ready") {
    next = withStepUpdate(
      next,
      "technical",
      "done",
      "SEO basics and HTTPS checked (PageSpeed optional).",
    );
  }

  // Ensure scores after sync
  if (next.analysisProgress?.status === "completed" || next.restaurantScores == null) {
    const hasAnyDone = next.analysisProgress?.steps.some((s) => s.status === "done");
    if (hasAnyDone) {
      next = applyRestaurantScoresToPayload(next);
    }
  }

  return next;
}

export async function persistAnalysisPayload(
  auditId: string,
  payload: AuditResultPayload,
): Promise<void> {
  await prisma.visibilityAudit.update({
    where: { id: auditId },
    data: {
      resultPayload: payload as Prisma.InputJsonValue,
      overallScore: payload.restaurantScores?.overall ?? payload.scores.overall,
      seoScore: payload.scores.seo,
      designScore: payload.scores.design,
      mobileScore: payload.scores.mobile,
      conversionScore: payload.scores.conversion,
    },
  });
}

export async function markAnalysisStep(
  auditId: string,
  stepId: AnalysisStepId,
  status: AnalysisStepStatus,
  detail?: string,
): Promise<AuditResultPayload | null> {
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!audit) return null;
  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) return null;
  const next = withStepUpdate(payload, stepId, status, detail);
  await persistAnalysisPayload(auditId, next);
  return next;
}

export async function finalizeAnalysisProgress(auditId: string): Promise<AuditResultPayload | null> {
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!audit) return null;
  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) return null;
  const synced = syncAnalysisProgressFromPayload(payload);
  await persistAnalysisPayload(auditId, synced);
  return synced;
}
