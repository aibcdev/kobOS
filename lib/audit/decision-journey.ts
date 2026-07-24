/**
 * Operator Audit — Restaurant Decision Journey™ view-model.
 * Story-first diagnosis: map customer drop-offs to Discovery / Trust / Desire / Conversion.
 */

import {
  computeAuditOpportunityReport,
  ensureMoneyFirstOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import {
  customerRangeFromPoint,
  inferCuisineKey,
  revenueRangeFromCustomers,
} from "@/lib/audit/growth-report-v2";
import type { AuditResultPayload, RestaurantScoresV1 } from "@/lib/audit/types";

export type JourneyStageId = "discovery" | "trust" | "desire" | "conversion" | "outcome";
export type JourneyStatus = "Strong" | "Acceptable" | "Leaking" | "Broken";

export type JourneyStage = {
  id: JourneyStageId;
  label: string;
  customerAction: string;
  score: number | null;
  status: JourneyStatus | null;
  experience: string;
};

export type JourneyDropOff = {
  stageId: JourneyStageId;
  stageLabel: string;
  score: number;
  status: JourneyStatus;
  headline: string;
  body: string;
};

export type JourneyStageDetail = {
  stageId: JourneyStageId;
  stageLabel: string;
  score: number;
  observed: string;
  whyItMatters: string;
  highestLeverageFix: string;
};

export type CompetitorFactor = {
  factor: string;
  whyItMatters: string;
  whatWeMeasure: string;
};

export type HowYouSit = {
  stageLabel: string;
  position: string;
};

export type RepairWeek = {
  week: number;
  stageLabel: string;
  title: string;
  action: string;
};

export type DecisionJourneyReport = {
  version: "decision-journey-v1";
  restaurantName: string;
  city: string;
  opening: string;
  stages: JourneyStage[];
  dropOffs: JourneyDropOff[];
  evidence: {
    customersLow: number;
    customersHigh: number;
    revenueLowGbp: number;
    revenueHighGbp: number;
    confidence: "low" | "medium" | "high";
    reasoning: string[];
  };
  stageDetails: JourneyStageDetail[];
  competitorFactors: CompetitorFactor[];
  howYouSit: HowYouSit[];
  peerDataAvailable: boolean;
  repairPlan: RepairWeek[];
  closer: {
    startStageLabel: string;
    body: string;
  };
  cuisineLabel: string;
};

const AOV_BY_CUISINE: Record<string, number> = {
  burger: 28,
  pizza: 26,
  coffee: 12,
  asian: 30,
  general: 32,
};

const CUISINE_REASON: Record<string, string> = {
  burger: "burgers / grill",
  pizza: "pizza",
  coffee: "café",
  asian: "Pakistani / Indian / Asian cuisine",
  general: "independent restaurants",
};

export function journeyStatusFromScore(score: number): JourneyStatus {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return "Strong";
  if (s >= 60) return "Acceptable";
  if (s >= 45) return "Leaking";
  return "Broken";
}

function clampScore(n: number | null | undefined, fallback: number): number {
  if (n == null || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Desire = photo / visual freshness on Google — never invent peer photo counts. */
export function scoreDesireStage(payload: AuditResultPayload, rs: RestaurantScoresV1 | null | undefined): number {
  const gp = payload.evidencePack?.googlePlace;
  const photos = gp?.photoCount;
  if (photos != null && Number.isFinite(photos)) {
    if (photos >= 50) return 82;
    if (photos >= 30) return 68;
    if (photos >= 15) return 55;
    if (photos >= 8) return 48;
    return 38;
  }
  // Fallback: blend GBP + reviews without inventing photo numbers
  const gbp = rs?.gbp ?? 50;
  const reviews = rs?.reviews ?? 50;
  return Math.round(gbp * 0.55 + reviews * 0.45);
}

function experienceFor(
  id: JourneyStageId,
  status: JourneyStatus | null,
): string {
  if (id === "outcome") return "Decision happens here";
  if (!status) return "Not enough data yet";
  switch (id) {
    case "discovery":
      return status === "Strong" || status === "Acceptable"
        ? "You appear in search with a competitive listing"
        : status === "Leaking"
          ? "You appear, but weaker than the places next door"
          : "Guests struggle to find you in local search";
    case "trust":
      return status === "Broken"
        ? "Guests see unanswered reviews and go elsewhere"
        : status === "Leaking"
          ? "Reviews exist, but owner replies look thin"
          : "Reviews and replies support guest confidence";
    case "desire":
      return status === "Broken" || status === "Leaking"
        ? "Photos feel outdated compared to competitors"
        : "Photos and posts look current enough to create appetite";
    case "conversion":
      return status === "Strong" || status === "Acceptable"
        ? "Site works, but the next action may still not be obvious"
        : "The next action (call / order / reserve) is hard to find";
    default:
      return "";
  }
}

function dropOffCopy(
  id: JourneyStageId,
  status: JourneyStatus,
  score: number,
): { headline: string; body: string } {
  const label =
    id === "discovery"
      ? "Discovery"
      : id === "trust"
        ? "Trust"
        : id === "desire"
          ? "Desire"
          : "Conversion";
  const statusWord =
    status === "Broken"
      ? "broken"
      : status === "Leaking"
        ? "leaking"
        : status === "Acceptable"
          ? "under-performing"
          : "soft";

  if (id === "trust") {
    return {
      headline: `Trust stage is ${statusWord} (${score}/100)`,
      body: "Guests read the reviews, see almost no owner replies, and many leave at this point — especially when nearby restaurants are more responsive.",
    };
  }
  if (id === "desire") {
    return {
      headline: `Desire stage is ${statusWord} (${score}/100)`,
      body: "Photos and Google posts feel static. Fresh, appetising visuals are what win the map pack click.",
    };
  }
  if (id === "discovery") {
    return {
      headline: `Discovery stage is ${statusWord} (${score}/100)`,
      body: "You appear in search, but the listing is not strong enough to win the click against nearby options.",
    };
  }
  return {
    headline: `${label} stage is ${statusWord} (${score}/100)`,
    body: "The website works, but the primary action (call, order, or reserve) is not obvious enough on mobile.",
  };
}

function stageDetailFor(
  id: JourneyStageId,
  score: number,
  payload: AuditResultPayload,
  topFixTitle: string | null,
): JourneyStageDetail {
  const gaps = payload.restaurantScores?.dataGaps ?? [];
  if (id === "discovery") {
    return {
      stageId: id,
      stageLabel: "Discovery – Google Presence",
      score,
      observed:
        gaps.find((g) => /Google Business|GBP|listing|schema/i.test(g)) ??
        "Missing or incomplete signals (categories, attributes, schema) weaken local pack presence.",
      whyItMatters: "Local pack ranking decides whether guests ever see you.",
      highestLeverageFix:
        topFixTitle && /google|schema|post|listing|gbp|discover/i.test(topFixTitle)
          ? topFixTitle
          : "Complete Restaurant schema + keep Google Posts active weekly.",
    };
  }
  if (id === "trust") {
    return {
      stageId: id,
      stageLabel: "Trust – Reviews",
      score,
      observed:
        gaps.find((g) => /review/i.test(g)) ??
        "Low owner reply rate on Google reviews — guests notice silence.",
      whyItMatters: "Unanswered reviews are a visible trust filter before anyone visits.",
      highestLeverageFix:
        topFixTitle && /review|reply/i.test(topFixTitle)
          ? topFixTitle
          : "Reply to every open review from the last 90 days within the next 7 days.",
    };
  }
  if (id === "desire") {
    return {
      stageId: id,
      stageLabel: "Desire – Photos & Visuals",
      score,
      observed:
        gaps.find((g) => /photo/i.test(g)) ??
        "Old photos and infrequent Google Posts make the listing feel static.",
      whyItMatters: "Appetite is decided visually in the map pack before the website.",
      highestLeverageFix:
        topFixTitle && /photo|post|visual/i.test(topFixTitle)
          ? topFixTitle
          : "Replace 8–10 weakest photos with current food/interior shots; publish two posts this month.",
    };
  }
  return {
    stageId: id,
    stageLabel: "Conversion – Website",
    score,
    observed:
      gaps.find((g) => /CTA|website|menu/i.test(g)) ??
      "The next action (call / order / reserve) isn’t obvious enough on the first screen.",
    whyItMatters: "Guests who reach the site still bounce if the path is unclear on mobile.",
    highestLeverageFix:
      topFixTitle && /website|cta|mobile|menu|homepage/i.test(topFixTitle)
        ? topFixTitle
        : "One clear primary Call to Action above the fold on mobile.",
  };
}

const COMPETITOR_FACTORS: CompetitorFactor[] = [
  {
    factor: "Rating + review volume",
    whyItMatters: "Instant trust filter",
    whatWeMeasure: "Star rating, total reviews, recent velocity",
  },
  {
    factor: "Owner response behaviour",
    whyItMatters: "Signals care and professionalism",
    whatWeMeasure: "Reply rate and recency on Google reviews",
  },
  {
    factor: "Photo freshness & quality",
    whyItMatters: "Creates appetite in the map pack",
    whatWeMeasure: "Photo count and visual currency (when available)",
  },
  {
    factor: "Google Posts frequency",
    whyItMatters: "Shows the place is alive",
    whatWeMeasure: "Post cadence when exposed by the scan",
  },
  {
    factor: "Listing completeness",
    whyItMatters: "Helps Google and guests understand you",
    whatWeMeasure: "Categories, attributes, schema, hours signals",
  },
  {
    factor: "Website first-screen clarity",
    whyItMatters: "Turns interest into a booking or order",
    whatWeMeasure: "CTA visibility, menu access, mobile clarity",
  },
];

function positionVsScore(score: number): string {
  if (score < 45) return "clearly behind";
  if (score < 60) return "behind";
  if (score < 72) return "slightly behind";
  return "closer to parity";
}

export type DecisionJourneyMeta = {
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
};

export function buildDecisionJourneyReport(
  payload: AuditResultPayload,
  meta: DecisionJourneyMeta,
): DecisionJourneyReport {
  const opportunity = ensureMoneyFirstOpportunityReport(
    payload.opportunityReport ??
      computeAuditOpportunityReport(payload, {
        name: meta.restaurantName,
        city: meta.city,
        websiteUrl: meta.websiteUrl,
      }),
    payload,
  );

  const rs = payload.restaurantScores;
  const discovery = clampScore(rs?.gbp ?? rs?.competitors ?? payload.scores?.seo, 55);
  const trust = clampScore(rs?.reviews, 50);
  const desire = scoreDesireStage(payload, rs);
  const conversion = clampScore(rs?.website ?? payload.scores?.conversion, 60);

  const scored: Array<{ id: Exclude<JourneyStageId, "outcome">; label: string; action: string; score: number }> = [
    { id: "discovery", label: "Discovery", action: "Finds you on Google", score: discovery },
    { id: "trust", label: "Trust", action: "Looks at reviews", score: trust },
    { id: "desire", label: "Desire", action: "Looks at photos", score: desire },
    { id: "conversion", label: "Conversion", action: "Visits website", score: conversion },
  ];

  const stages: JourneyStage[] = [
    ...scored.map((s) => {
      const status = journeyStatusFromScore(s.score);
      return {
        id: s.id,
        label: s.label,
        customerAction: s.action,
        score: s.score,
        status,
        experience: experienceFor(s.id, status),
      };
    }),
    {
      id: "outcome",
      label: "Outcome",
      customerAction: "Decides",
      score: null,
      status: null,
      experience: experienceFor("outcome", null),
    },
  ];

  const dropOffs = [...scored]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((s) => {
      const status = journeyStatusFromScore(s.score);
      const copy = dropOffCopy(s.id, status, s.score);
      return {
        stageId: s.id,
        stageLabel: s.label,
        score: s.score,
        status,
        headline: copy.headline,
        body: copy.body,
      };
    });

  const lostPoint = opportunity.opportunity_score?.est_monthly_lost_customers ?? 45;
  const { low: customersLow, high: customersHigh } = customerRangeFromPoint(lostPoint);
  const cuisineKey = inferCuisineKey(meta.restaurantName, meta.websiteUrl ?? null);
  const aov = AOV_BY_CUISINE[cuisineKey] ?? 32;
  const revenue = revenueRangeFromCustomers(customersLow, customersHigh, aov);
  const confidence = rs?.confidence ?? "medium";
  const city = meta.city?.trim() || "your area";
  const cuisineReason = CUISINE_REASON[cuisineKey] ?? "independent restaurants";

  const fixes = opportunity.topFixes ?? [];
  const fixFor = (re: RegExp) => fixes.find((f) => re.test(f.title))?.title ?? null;

  const stageDetails: JourneyStageDetail[] = (
    ["discovery", "trust", "desire", "conversion"] as const
  ).map((id) => {
    const score = scored.find((s) => s.id === id)!.score;
    const top =
      id === "trust"
        ? fixFor(/review|reply/i)
        : id === "desire"
          ? fixFor(/photo|post|visual/i)
          : id === "discovery"
            ? fixFor(/google|schema|listing|gbp|discover|seo/i)
            : fixFor(/website|cta|mobile|menu|homepage/i);
    return stageDetailFor(id, score, payload, top);
  });

  const peerDataAvailable =
    (opportunity.nearbyComparison?.length ?? 0) > 0 ||
    payload.competitors.some((c) => c.source === "places");

  const howYouSit: HowYouSit[] = scored.map((s) => ({
    stageLabel: s.label,
    position: positionVsScore(s.score),
  }));

  const weakest = dropOffs[0];
  const repairPlan: RepairWeek[] = [
    {
      week: 1,
      stageLabel: "Trust",
      title: "Fix Trust",
      action: stageDetails.find((d) => d.stageId === "trust")?.highestLeverageFix ?? "Reply to every open Google review.",
    },
    {
      week: 2,
      stageLabel: "Desire",
      title: "Fix Desire",
      action:
        stageDetails.find((d) => d.stageId === "desire")?.highestLeverageFix ??
        "Replace weakest photos; publish two Google Posts.",
    },
    {
      week: 3,
      stageLabel: "Discovery",
      title: "Strengthen Discovery",
      action:
        stageDetails.find((d) => d.stageId === "discovery")?.highestLeverageFix ??
        "Complete GBP attributes; add Restaurant schema.",
    },
    {
      week: 4,
      stageLabel: "Conversion",
      title: "Tighten Conversion",
      action:
        stageDetails.find((d) => d.stageId === "conversion")?.highestLeverageFix ??
        "Optimise mobile CTA; ensure menu is reachable in 2 taps.",
    },
  ];

  return {
    version: "decision-journey-v1",
    restaurantName: meta.restaurantName,
    city,
    opening: `We analysed the exact journey your next customer takes before deciding where to eat in ${city}. Here are the three places you’re currently losing them.`,
    stages,
    dropOffs,
    evidence: {
      customersLow,
      customersHigh,
      revenueLowGbp: revenue.low,
      revenueHighGbp: revenue.high,
      confidence,
      reasoning: [
        `Local search volume proxies for ${cuisineReason} in ${city}.`,
        "Observed difference in profile actions between restaurants that reply to reviews vs those that don’t.",
        "Typical conversion lift when Google photos and posts are current vs dated.",
        `Conservative average ticket assumption for this category (~£${aov}).`,
      ],
    },
    stageDetails,
    competitorFactors: COMPETITOR_FACTORS,
    howYouSit,
    peerDataAvailable,
    repairPlan,
    closer: {
      startStageLabel: weakest?.stageLabel ?? "Trust",
      body: `Start with the ${weakest?.stageLabel ?? "Trust"} stage first — that’s where guests are most visibly dropping off before they ever reach you. Run this plan yourself, or let KOB handle daily execution with Daily Co-Pilot.`,
    },
    cuisineLabel: cuisineReason,
  };
}
