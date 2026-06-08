import { buildPeerBenchmarkContext, sanitizeBenchmarkAnchors } from "@/lib/audit/peer-benchmark-config";
import type { AuditResultPayload, PerceptionAuditV1, PerceptionOwnerHero } from "@/lib/audit/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function avgCompetitorScore(payload: AuditResultPayload): number | null {
  const scores = payload.competitors.map((c) => c.mockScore).filter((s) => Number.isFinite(s));
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeLeakPercent(dps: number, peerAvg: number | null): { low: number; high: number } {
  const gap = peerAvg != null ? Math.max(0, peerAvg - dps) : Math.max(0, 55 - dps);
  const low = clamp(Math.min(30, 8 + gap * 0.35), 5, 30);
  const high = clamp(Math.min(40, low + 8 + gap * 0.15), low + 3, 40);
  return { low, high };
}

function computeRevenueBandGbp(
  leakLow: number,
  leakHigh: number,
  gap: number,
  confidence: PerceptionAuditV1["confidence"],
): { low: number; high: number } | null {
  if (gap < 15 || confidence === "low") return null;
  const coversLow = 200;
  const coversHigh = 400;
  const ticket = 28;
  const low = clamp((coversLow * ticket * leakLow) / 100, 500, 15000);
  const high = clamp((coversHigh * ticket * leakHigh) / 100, low + 500, 25000);
  return { low, high };
}

function shortenRoadmap(items: string[], fallback: string): string {
  const first = items.find((s) => s.trim());
  if (!first) return fallback;
  return first.length > 90 ? `${first.slice(0, 87)}…` : first;
}

export function buildOwnerHeroFallback(
  payload: AuditResultPayload,
  perception: PerceptionAuditV1,
): PerceptionOwnerHero {
  const peer = buildPeerBenchmarkContext(payload);
  const dps = perception.digitalPositioningScore;
  const peerAvg = avgCompetitorScore(payload);
  const gap = peerAvg != null ? Math.max(0, peerAvg - dps) : Math.max(0, 50 - dps);
  const leak = computeLeakPercent(dps, peerAvg);
  const revenueBand = computeRevenueBandGbp(leak.low, leak.high, gap, perception.confidence);

  const anchors = sanitizeBenchmarkAnchors(
    perception.benchmarkAnchors,
    peer.suggestedAnchors,
  );
  const comparedNames = anchors.slice(0, 2);
  const comparedToLabel =
    comparedNames.length > 0
      ? `Compared to peers like ${comparedNames.join(" and ")}`
      : "Compared to established multi-site operators in your market";

  const topLeak = perception.revenueLeaks.find((l) => l.impact === "high") ?? perception.revenueLeaks[0];
  const roadmap = payload.gated?.roadmap;

  const customerLossBullets = [
    topLeak
      ? topLeak.title
      : "Guests with high booking intent may choose rivals with sharper websites",
    gap >= 20
      ? "Your site and social presence score noticeably below nearby competitors"
      : "Mobile and social signals are not keeping pace with local rivals",
    perception.visualScorecard?.find((r) => r.category === "Conversion flow" && r.scoreOutOf10 <= 5)
      ? "Weak booking and order paths on mobile"
      : "Brand presentation online undersells in-room quality",
  ].slice(0, 3);

  return {
    revenueHeadline:
      gap >= 20
        ? "You are likely losing high-intent guests to sharper local rivals online"
        : "There is measurable booking and discovery leakage versus local peers",
    bookingLeakPercentLow: leak.low,
    bookingLeakPercentHigh: leak.high,
    monthlyRevenueBandLowGbp: revenueBand?.low,
    monthlyRevenueBandHighGbp: revenueBand?.high,
    revenueDetail:
      topLeak?.narrative.slice(0, 400) ??
      "Website and social quality gaps mean guests often trust a competitor before they visit you.",
    customerLossBullets,
    timelineHeadline: "First visible wins in 2–4 weeks; stronger results in 30–90 days",
    timelinePhases: [
      {
        window: "2–4 weeks",
        outcome: shortenRoadmap(roadmap?.days30 ?? [], "Fix homepage clarity, CTAs, and Google listing basics"),
      },
      {
        window: "30–60 days",
        outcome: shortenRoadmap(roadmap?.days60 ?? [], "Stronger imagery, social rhythm, and local discovery pages"),
      },
      {
        window: "90 days",
        outcome: shortenRoadmap(roadmap?.days90 ?? [], "Close the gap vs peer operators on brand and conversion"),
      },
    ],
    comparedToLabel,
  };
}

export function ensureOwnerHero(
  payload: AuditResultPayload,
  perception: PerceptionAuditV1,
): PerceptionAuditV1 {
  const fallback = buildOwnerHeroFallback(payload, perception);
  const fromModel = perception.ownerHero;

  if (!fromModel) {
    return { ...perception, ownerHero: fallback };
  }

  const leakLow = fromModel.bookingLeakPercentLow ?? fallback.bookingLeakPercentLow;
  const leakHigh = Math.max(leakLow + 2, fromModel.bookingLeakPercentHigh ?? fallback.bookingLeakPercentHigh);

  return {
    ...perception,
    ownerHero: {
      revenueHeadline: fromModel.revenueHeadline?.trim() || fallback.revenueHeadline,
      bookingLeakPercentLow: clamp(leakLow, 5, 35),
      bookingLeakPercentHigh: clamp(leakHigh, leakLow + 2, 45),
      monthlyRevenueBandLowGbp: fromModel.monthlyRevenueBandLowGbp ?? fallback.monthlyRevenueBandLowGbp,
      monthlyRevenueBandHighGbp: fromModel.monthlyRevenueBandHighGbp ?? fallback.monthlyRevenueBandHighGbp,
      revenueDetail: fromModel.revenueDetail?.trim() || fallback.revenueDetail,
      customerLossBullets:
        fromModel.customerLossBullets?.length >= 2
          ? fromModel.customerLossBullets.slice(0, 3)
          : fallback.customerLossBullets,
      timelineHeadline: fromModel.timelineHeadline?.trim() || fallback.timelineHeadline,
      timelinePhases:
        fromModel.timelinePhases?.length === 3 ? fromModel.timelinePhases : fallback.timelinePhases,
      comparedToLabel: fromModel.comparedToLabel?.trim() || fallback.comparedToLabel,
    },
  };
}
