/** Owner grader.owner.com scanning phase timing (visual sequence). */
export type GraderScanPhase =
  | "competitors"
  | "gbp"
  | "reviewSentiment"
  | "photoQuality"
  | "website"
  | "mobile";

const PHASE_ORDER: GraderScanPhase[] = [
  "competitors",
  "gbp",
  "reviewSentiment",
  "photoQuality",
  "website",
  "mobile",
];

const PHASE_MS: Record<GraderScanPhase, number> = {
  competitors: 9_000,
  gbp: 8_000,
  reviewSentiment: 8_000,
  photoQuality: 8_000,
  website: 9_000,
  mobile: 8_000,
};

const MIN_DWELL_MS: Record<GraderScanPhase, number> = {
  competitors: 4_000,
  gbp: 3_500,
  reviewSentiment: 3_500,
  photoQuality: 3_000,
  website: 3_500,
  mobile: 3_000,
};

export type GraderScanSignals = {
  hasGeo?: boolean;
  hasGooglePlace?: boolean;
  hasPreviewImage?: boolean;
  hasReviews?: boolean;
  hasPhotos?: boolean;
};

export const GRADER_COUNTDOWN_START_SEC = 30;

export function effectivePhaseOrder(signals?: GraderScanSignals): GraderScanPhase[] {
  let order = [...PHASE_ORDER];
  if (!signals?.hasReviews) {
    order = order.filter((p) => p !== "reviewSentiment");
  }
  return order;
}

function signalReadyForAdvance(phase: GraderScanPhase, signals?: GraderScanSignals): boolean {
  if (!signals) return false;
  switch (phase) {
    case "competitors":
      return Boolean(signals.hasGeo);
    case "gbp":
      return Boolean(signals.hasGooglePlace || signals.hasGeo);
    case "reviewSentiment":
      return Boolean(signals.hasReviews);
    case "photoQuality":
      return Boolean(signals.hasPhotos || signals.hasPreviewImage);
    case "website":
    case "mobile":
      return Boolean(signals.hasPreviewImage);
  }
}

export function resolveGraderPhase(
  elapsedMs: number,
  scanReady: boolean,
  signals?: GraderScanSignals,
): GraderScanPhase {
  const order = effectivePhaseOrder(signals);
  if (scanReady) return order[order.length - 1] ?? "mobile";

  let cursor = 0;
  for (let i = 0; i < order.length; i++) {
    const phase = order[i]!;
    const maxEnd = cursor + PHASE_MS[phase];

    if (elapsedMs < cursor) return order[Math.max(0, i - 1)]!;

    const dwell = elapsedMs - cursor;
    const minMet = dwell >= MIN_DWELL_MS[phase];
    const signalOk = signalReadyForAdvance(phase, signals);
    const timedOut = elapsedMs >= maxEnd;

    if (!timedOut && !(minMet && signalOk)) {
      return phase;
    }

    cursor = timedOut ? maxEnd : elapsedMs;
  }
  return order[order.length - 1] ?? "mobile";
}

function phaseWindow(elapsedMs: number, scanReady: boolean, signals?: GraderScanSignals) {
  const order = effectivePhaseOrder(signals);
  const phase = resolveGraderPhase(elapsedMs, scanReady, signals);
  let cursor = 0;
  for (const p of order) {
    const maxEnd = cursor + PHASE_MS[p];
    if (p === phase) {
      return { phase, start: cursor, end: maxEnd };
    }
    const dwell = elapsedMs - cursor;
    const minMet = dwell >= MIN_DWELL_MS[p];
    const signalOk = signalReadyForAdvance(p, signals);
    const timedOut = elapsedMs >= maxEnd;
    cursor = timedOut ? maxEnd : minMet && signalOk ? elapsedMs : maxEnd;
  }
  const last = order[order.length - 1] ?? "mobile";
  return { phase: last, start: cursor, end: cursor + PHASE_MS[last] };
}

export type GraderStepState = "done" | "active" | "pending";

export function graderStepState(
  step: GraderScanPhase,
  currentPhase: GraderScanPhase,
  signals?: GraderScanSignals,
): GraderStepState {
  const order = effectivePhaseOrder(signals);
  const stepIdx = order.indexOf(step);
  const currentIdx = order.indexOf(currentPhase);
  if (stepIdx < 0) return "pending";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function graderStepLabel(
  step: GraderScanPhase,
  restaurantName: string,
  websiteHost: string,
): string {
  switch (step) {
    case "competitors":
      return `${restaurantName} & competitors`;
    case "gbp":
      return "Google business profile";
    case "reviewSentiment":
      return "Google review sentiment";
    case "photoQuality":
      return "Photo quality and quantity";
    case "website":
      return websiteHost ? `https://${websiteHost.replace(/^https?:\/\//i, "").slice(0, 32)}…` : "Website scan";
    case "mobile":
      return "Mobile experience";
  }
}

export function graderContextStatus(
  phase: GraderScanPhase,
  signals?: GraderScanSignals,
): string {
  switch (phase) {
    case "competitors":
      return signals?.hasGeo ? "Checking nearby competitors on the map" : "Locating your restaurant";
    case "gbp":
      return signals?.hasGooglePlace ? "Reading your Google Business Profile" : "No description found";
    case "reviewSentiment":
      return signals?.hasReviews ? "Analysing guest review sentiment" : "Checking Google reviews";
    case "photoQuality":
      return signals?.hasPhotos ? "Reviewing listing and website photos" : "Checking photo quality";
    case "website":
      return "Scanning your website pages";
    case "mobile":
      return "Testing mobile experience";
  }
}

export function graderCountdownSeconds(elapsedMs: number, scanReady: boolean): number {
  if (scanReady) return 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  return Math.max(0, GRADER_COUNTDOWN_START_SEC - elapsedSec);
}

export function graderPhaseProgress(
  elapsedMs: number,
  scanReady: boolean,
  signals?: GraderScanSignals,
): number {
  if (scanReady) return 100;
  const order = effectivePhaseOrder(signals);
  const phase = resolveGraderPhase(elapsedMs, scanReady, signals);
  const phaseIdx = order.indexOf(phase);
  const { start, end } = phaseWindow(elapsedMs, scanReady, signals);
  const dur = Math.max(1, end - start);
  const within = Math.min(1, (elapsedMs - start) / dur);
  const base = (phaseIdx / order.length) * 100;
  return Math.min(92, base + within * (100 / order.length));
}

import { UK_MAP_CENTER } from "@/lib/places/audit-places-config";

export function graderCoordsFromCity(city: string): { lat: number; lng: number } {
  let h = 0;
  for (const c of city) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const lat = UK_MAP_CENTER.lat + ((h % 100) - 50) / 800;
  const lng = UK_MAP_CENTER.lng + (((h >> 8) % 100) - 50) / 800;
  return { lat, lng };
}

export function onlineHealthLabel(score: number): "Poor" | "Fair" | "Good" {
  if (score < 50) return "Poor";
  if (score < 80) return "Fair";
  return "Good";
}
