/** Owner grader.owner.com scanning phase timing (visual sequence). */
export type GraderScanPhase = "map" | "business" | "website" | "mobile" | "reviews";

const PHASE_ORDER: GraderScanPhase[] = ["map", "business", "website", "mobile", "reviews"];

const PHASE_MS: Record<GraderScanPhase, number> = {
  map: 9_000,
  business: 8_000,
  website: 9_000,
  mobile: 8_000,
  reviews: 20_000,
};

/** Minimum time to show each phase before advancing on signals. */
const MIN_DWELL_MS: Record<GraderScanPhase, number> = {
  map: 4_000,
  business: 3_500,
  website: 3_500,
  mobile: 3_000,
  reviews: 4_000,
};

export type GraderScanSignals = {
  hasGeo?: boolean;
  hasGooglePlace?: boolean;
  hasPreviewImage?: boolean;
  hasReviews?: boolean;
};

export const GRADER_COUNTDOWN_START_SEC = 36;

function effectivePhaseOrder(signals?: GraderScanSignals): GraderScanPhase[] {
  if (signals?.hasReviews) return PHASE_ORDER;
  return PHASE_ORDER.filter((p) => p !== "reviews");
}

function signalReadyForAdvance(phase: GraderScanPhase, signals?: GraderScanSignals): boolean {
  if (!signals) return false;
  switch (phase) {
    case "map":
      return Boolean(signals.hasGeo);
    case "business":
      return Boolean(signals.hasGooglePlace || signals.hasGeo);
    case "website":
    case "mobile":
      return Boolean(signals.hasPreviewImage);
    case "reviews":
      return Boolean(signals.hasReviews);
  }
}

/** Resolve phase with optional pipeline signals (early advance when data lands). */
export function resolveGraderPhase(
  elapsedMs: number,
  scanReady: boolean,
  signals?: GraderScanSignals,
): GraderScanPhase {
  const order = effectivePhaseOrder(signals);
  if (scanReady) return order[order.length - 1] ?? "reviews";

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
  return order[order.length - 1] ?? "reviews";
}

function phaseWindow(elapsedMs: number, scanReady: boolean, signals?: GraderScanSignals) {
  const order = effectivePhaseOrder(signals);
  const phase = resolveGraderPhase(elapsedMs, scanReady, signals);
  let cursor = 0;
  for (const p of order) {
    const maxEnd = cursor + PHASE_MS[p];
    const dwell = elapsedMs - cursor;
    const minMet = dwell >= MIN_DWELL_MS[p];
    const signalOk = signalReadyForAdvance(p, signals);
    const timedOut = elapsedMs >= maxEnd;
    if (p === phase) {
      return { phase, start: cursor, end: maxEnd, dwell };
    }
    cursor = timedOut ? maxEnd : minMet && signalOk ? elapsedMs : maxEnd;
  }
  const last = order[order.length - 1] ?? "reviews";
  return { phase: last, start: cursor, end: cursor + PHASE_MS[last], dwell: 0 };
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

/** Deterministic map center when Places lat/lng unavailable (UK-biased). */
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
