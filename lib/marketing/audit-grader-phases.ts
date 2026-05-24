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

export const GRADER_COUNTDOWN_START_SEC = 36;

export function resolveGraderPhase(elapsedMs: number, scanReady: boolean): GraderScanPhase {
  if (scanReady) return "reviews";
  let t = elapsedMs;
  for (const phase of PHASE_ORDER) {
    const dur = PHASE_MS[phase];
    if (t < dur) return phase;
    t -= dur;
  }
  return "reviews";
}

export function graderCountdownSeconds(elapsedMs: number, scanReady: boolean): number {
  if (scanReady) return 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  return Math.max(0, GRADER_COUNTDOWN_START_SEC - elapsedSec);
}

export function graderPhaseProgress(elapsedMs: number, scanReady: boolean): number {
  if (scanReady) return 100;
  let acc = 0;
  const total = PHASE_ORDER.reduce((s, p) => s + PHASE_MS[p], 0);
  for (const phase of PHASE_ORDER) {
    const dur = PHASE_MS[phase];
    if (elapsedMs < acc + dur) {
      const phaseIdx = PHASE_ORDER.indexOf(phase);
      const base = (phaseIdx / PHASE_ORDER.length) * 100;
      const within = (elapsedMs - acc) / dur;
      return Math.min(92, base + within * (100 / PHASE_ORDER.length));
    }
    acc += dur;
  }
  return 92;
}

/** Deterministic map center when Places lat/lng unavailable. */
export function graderCoordsFromCity(city: string): { lat: number; lng: number } {
  let h = 0;
  for (const c of city) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const lat = 40.72 + (h % 80) / 1000;
  const lng = -73.98 + ((h >> 8) % 80) / 1000;
  return { lat, lng };
}

export function onlineHealthLabel(score: number): "Poor" | "Fair" | "Good" {
  if (score < 50) return "Poor";
  if (score < 70) return "Fair";
  return "Good";
}
