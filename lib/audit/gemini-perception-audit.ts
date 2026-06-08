import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload, PerceptionAuditV1 } from "@/lib/audit/types";
import { applyAnchoredPerceptionScore } from "@/lib/audit/gemini-design-quality";
import { ensureOwnerHero } from "@/lib/audit/build-owner-hero";
import {
  buildPeerBenchmarkContext,
  sanitizeBenchmarkAnchors,
} from "@/lib/audit/peer-benchmark-config";
import { PERCEPTION_AUDIT_V1_SYSTEM } from "@/lib/prompts/audit/perception-audit-system";

const SCORECARD_CATEGORIES = [
  "Mobile experience",
  "Menu presentation",
  "Food imagery",
  "Brand consistency",
  "Google visibility",
  "Conversion flow",
] as const;

const confidenceSchema = z.enum(["low", "medium", "high"]);
const impactSchema = z.enum(["high", "medium", "low"]);

function scoreOutOf10From100(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n / 10)));
}

function buildScorecardFallback(payload: AuditResultPayload) {
  const eng = payload.evidencePack?.engagementSignals;
  const food = payload.evidencePack?.foodImageAnalysis?.aggregate;
  const design = payload.evidencePack?.designQualityAnalysis;
  const mobile = payload.scores.mobile;
  const conv = payload.scores.conversion;
  const seo = payload.scores.seo;
  const visual = payload.benchmarkV1Media?.visualBrandQuality.score ?? payload.scores.design;

  return SCORECARD_CATEGORIES.map((category) => {
    let score = 5;
    let note = "Based on available site signals.";
    switch (category) {
      case "Mobile experience":
        score = scoreOutOf10From100(mobile);
        if (design && design.designQualityScore < 50) score = Math.min(score, 4);
        note = eng?.rationale[0] ?? "Mobile layout and viewport signals reviewed.";
        break;
      case "Menu presentation":
        score = eng?.contentDepth.hasMenuContent ? 6 : 4;
        note = eng?.contentDepth.hasMenuContent
          ? "Menu content detected on site."
          : "Menu is hard to find or thin on mobile.";
        break;
      case "Food imagery":
        score = food ? scoreOutOf10From100(food.foodPhotographyScore) : scoreOutOf10From100(visual);
        note = food?.benchmarkNote ?? "Image quality inferred from page assets.";
        break;
      case "Brand consistency":
        score = design
          ? scoreOutOf10From100(design.designQualityScore)
          : scoreOutOf10From100(visual);
        note = design?.summary ?? "Visual consistency across hero and content blocks.";
        if (design?.tier === "amateur") score = Math.min(score, 4);
        break;
      case "Google visibility":
        score = scoreOutOf10From100(seo);
        note = "Local discovery and search readiness.";
        break;
      case "Conversion flow":
        score = scoreOutOf10From100(conv);
        note = eng
          ? `Stay-connected score ${eng.stayConnectedScore}/100 — booking, phone, and social paths.`
          : "Booking and contact paths reviewed.";
        break;
    }
    return { category, scoreOutOf10: score, note: note.slice(0, 220) };
  });
}

function buildExecutiveFallback(payload: AuditResultPayload) {
  const name = payload.evidencePack?.restaurantName ?? "Your restaurant";
  return {
    strengths: [
      `${name} has real-world hospitality credentials worth protecting online.`,
      "There are clear foundations to build a premium digital presence on.",
    ],
    gapStatement:
      "However, the digital experience currently undersells the quality guests receive in the room.",
    impacts: [
      "Customer trust before the first visit",
      "Direct bookings vs third-party fees",
      "Mobile conversion on the go",
      "Perceived brand quality",
      "Google visibility for high-intent searches",
    ],
  };
}
const ownerHeroSchema = z
  .object({
    revenueHeadline: z.string().min(10).max(220),
    bookingLeakPercentLow: z.number().int().min(5).max(40),
    bookingLeakPercentHigh: z.number().int().min(8).max(50),
    monthlyRevenueBandLowGbp: z.number().int().optional(),
    monthlyRevenueBandHighGbp: z.number().int().optional(),
    revenueDetail: z.string().min(20).max(500),
    customerLossBullets: z.array(z.string().min(1).max(200)).min(2).max(3),
    timelineHeadline: z.string().min(10).max(160),
    timelinePhases: z
      .array(
        z.object({
          window: z.string().min(3).max(40),
          outcome: z.string().min(10).max(200),
        }),
      )
      .length(3),
    comparedToLabel: z.string().min(10).max(200),
  })
  .optional();

export const perceptionAuditV1Schema = z.object({
  digitalPositioningScore: z.number().int().min(0).max(100),
  confidence: confidenceSchema,
  coverHeadline: z.string().min(10).max(220).optional(),
  coverSubheadline: z.string().min(10).max(320).optional(),
  executiveSummary: z
    .object({
      strengths: z.array(z.string().min(1).max(200)).min(2).max(4),
      gapStatement: z.string().min(20).max(600),
      impacts: z.array(z.string().min(1).max(160)).min(3).max(6),
    })
    .optional(),
  visualScorecard: z
    .array(
      z.object({
        category: z.string().min(1).max(60),
        scoreOutOf10: z.number().int().min(1).max(10),
        note: z.string().min(1).max(220),
      }),
    )
    .length(6)
    .optional(),
  estimatedDwellSeconds: z
    .object({
      low: z.number().int().min(1).max(300),
      high: z.number().int().min(2).max(360),
      rationale: z.string().min(10).max(400),
    })
    .optional(),
  positioningTable: z
    .array(
      z.object({
        area: z.string().min(1).max(80),
        current: z.string().min(1).max(120),
        ideal: z.string().min(1).max(120),
      }),
    )
    .min(8)
    .max(8),
  perceptionGap: z
    .array(
      z.object({
        metric: z.string().min(1).max(80),
        current: z.string().min(1).max(80),
        potential: z.string().min(1).max(80),
        note: z.string().max(200).optional(),
      }),
    )
    .min(6)
    .max(6),
  customerExperience: z.string().min(20).max(2000),
  modernStandard: z.string().min(20).max(2000),
  reviewIntelligence: z.object({
    praiseThemes: z.array(z.string().min(1).max(200)).max(6),
    complaintThemes: z.array(z.string().min(1).max(200)).max(6),
    disconnect: z.string().min(10).max(1200),
  }),
  socialAnalysis: z.string().min(10).max(1500),
  commercialSeo: z.string().min(10).max(1200),
  revenueLeaks: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        impact: impactSchema,
        narrative: z.string().min(10).max(500),
      }),
    )
    .min(3)
    .max(6),
  benchmarkAnchors: z.array(z.string().min(1).max(120)).min(2).max(6),
  overallSummary: z.string().min(10).max(800),
  ownerHero: ownerHeroSchema,
});

function modelSlug() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

/** Gemini sometimes nests output or uses alternate row keys — flatten before Zod. */
function normalizePerceptionJson(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const root = raw as Record<string, unknown>;
  let candidate: Record<string, unknown> = root;
  for (const key of ["perceptionAuditV1", "perceptionAudit", "audit", "result", "output"]) {
    const nested = root[key];
    if (nested && typeof nested === "object") {
      candidate = nested as Record<string, unknown>;
      break;
    }
  }

  const positioningTable = normalizeTableRows(
    candidate.positioningTable,
    ["area", "current", "ideal"],
    ["Area", "Current", "Ideal", "currentState", "idealState", "current_state", "ideal_state"],
    { area: 80, current: 120, ideal: 120 },
  );
  const perceptionGap = normalizeTableRows(
    candidate.perceptionGap,
    ["metric", "current", "potential"],
    ["Metric", "Current", "Potential", "currentState", "potentialState", "note"],
    { metric: 80, current: 80, potential: 80 },
  );

  const scoreRaw =
    candidate.digitalPositioningScore ??
    candidate.digital_positioning_score ??
    candidate.positioningScore ??
    candidate.overallScore;

  return {
    ...candidate,
    digitalPositioningScore: typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw),
    confidence: candidate.confidence ?? candidate.confidenceLevel ?? "medium",
    coverHeadline:
      candidate.coverHeadline ??
      candidate.cover_headline ??
      "Your digital experience is likely underselling your restaurant.",
    coverSubheadline:
      candidate.coverSubheadline ??
      candidate.cover_subheadline ??
      "We reviewed mobile UX, menu structure, imagery, discovery, and conversion.",
    executiveSummary: normalizeExecutiveSummary(candidate.executiveSummary ?? candidate.executive_summary),
    visualScorecard: normalizeScorecard(candidate.visualScorecard ?? candidate.visual_scorecard),
    estimatedDwellSeconds: normalizeEstimatedDwellSeconds(
      candidate.estimatedDwellSeconds ?? candidate.estimated_dwell_seconds,
    ),
    positioningTable,
    perceptionGap,
    reviewIntelligence: normalizeReviewIntel(candidate.reviewIntelligence ?? candidate.review_intelligence),
  };
}

function normalizeReviewIntel(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return { praiseThemes: [], complaintThemes: [], disconnect: "Review data was limited for this audit." };
  }
  const o = raw as Record<string, unknown>;
  return {
    praiseThemes: o.praiseThemes ?? o.praise_themes ?? [],
    complaintThemes: o.complaintThemes ?? o.complaint_themes ?? [],
    disconnect: o.disconnect ?? o.gap ?? o.summary ?? "Limited review coverage in evidence.",
  };
}

function normalizeScorecard(rows: unknown): unknown[] | undefined {
  if (!Array.isArray(rows)) return undefined;
  return rows.map((row, i) => {
    if (!row || typeof row !== "object") return row;
    const r = row as Record<string, unknown>;
    const raw = r.scoreOutOf10 ?? r.score ?? r.score_out_of_10;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? "5"), 10);
    return {
      category: String(r.category ?? SCORECARD_CATEGORIES[i] ?? "Category").slice(0, 60),
      scoreOutOf10: Math.min(10, Math.max(1, Number.isFinite(n) ? n : 5)),
      note: String(r.note ?? r.detail ?? "Reviewed from site evidence.").slice(0, 220),
    };
  });
}

const EXEC_SUMMARY_IMPACT_FALLBACKS = [
  "Guest trust before the first visit",
  "Direct bookings vs third-party fees",
  "Mobile conversion on the go",
  "Perceived brand quality",
  "Google visibility for high-intent searches",
] as const;

const EXEC_SUMMARY_STRENGTH_FALLBACKS = [
  "Strong hospitality foundations worth showcasing online.",
  "Clear room to elevate the digital first impression.",
] as const;

function normalizeExecutiveSummary(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const strengths = Array.isArray(o.strengths)
    ? o.strengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
    : [];
  const impacts = Array.isArray(o.impacts)
    ? o.impacts.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
    : [];
  for (const fallback of EXEC_SUMMARY_STRENGTH_FALLBACKS) {
    if (strengths.length >= 2) break;
    if (!strengths.includes(fallback)) strengths.push(fallback);
  }
  for (const fallback of EXEC_SUMMARY_IMPACT_FALLBACKS) {
    if (impacts.length >= 3) break;
    if (!impacts.includes(fallback)) impacts.push(fallback);
  }
  return {
    strengths,
    gapStatement: String(
      o.gapStatement ?? o.gap ?? "However, the digital experience undersells the in-room quality.",
    ).slice(0, 600),
    impacts,
  };
}

function normalizeEstimatedDwellSeconds(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const lowRaw = typeof o.low === "number" ? o.low : Number(o.low ?? 8);
  const highRaw = typeof o.high === "number" ? o.high : Number(o.high ?? 25);
  let rationale = String(o.rationale ?? o.reason ?? "").trim();
  if (rationale.length < 10) {
    rationale = "Estimated from content depth, imagery, and mobile browsing signals.";
  }
  return {
    low: Math.min(300, Math.max(1, Math.round(Number.isFinite(lowRaw) ? lowRaw : 8))),
    high: Math.min(360, Math.max(2, Math.round(Number.isFinite(highRaw) ? highRaw : 25))),
    rationale: rationale.slice(0, 400),
  };
}

function normalizeTableRows(
  rows: unknown,
  keys: [string, string, string],
  altKeys: string[],
  maxLen: Record<string, number>,
): unknown[] | undefined {
  if (!Array.isArray(rows)) return undefined;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const [k0, k1, k2] = keys;
    const clip = (key: string, val: unknown, fallback: string) => {
      const s = String(val ?? fallback).trim() || fallback;
      return s.slice(0, maxLen[key] ?? 80);
    };
    out[k0] = clip(k0, r[k0] ?? r[altKeys[0]] ?? r[altKeys[3]], "Area");
    out[k1] = clip(k1, r[k1] ?? r[altKeys[1]] ?? r[altKeys[4]] ?? r[altKeys[6]], "Current state");
    out[k2] = clip(k2, r[k2] ?? r[altKeys[2]] ?? r[altKeys[5]], "Target state");
    if (r.note) out.note = String(r.note).slice(0, 200);
    return out;
  });
}

const PERCEPTION_JSON_SCHEMA_HINT = {
  type: "object",
  required: [
    "digitalPositioningScore",
    "confidence",
    "coverHeadline",
    "coverSubheadline",
    "executiveSummary",
    "visualScorecard",
    "estimatedDwellSeconds",
    "positioningTable",
    "perceptionGap",
    "customerExperience",
    "modernStandard",
    "reviewIntelligence",
    "socialAnalysis",
    "commercialSeo",
    "revenueLeaks",
    "benchmarkAnchors",
    "overallSummary",
    "ownerHero",
  ],
  properties: {
    digitalPositioningScore: { type: "integer", minimum: 0, maximum: 100 },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    positioningTable: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        required: ["area", "current", "ideal"],
        properties: { area: { type: "string" }, current: { type: "string" }, ideal: { type: "string" } },
      },
    },
    perceptionGap: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        required: ["metric", "current", "potential"],
        properties: {
          metric: { type: "string" },
          current: { type: "string" },
          potential: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    customerExperience: { type: "string" },
    modernStandard: { type: "string" },
    reviewIntelligence: {
      type: "object",
      required: ["praiseThemes", "complaintThemes", "disconnect"],
      properties: {
        praiseThemes: { type: "array", items: { type: "string" } },
        complaintThemes: { type: "array", items: { type: "string" } },
        disconnect: { type: "string" },
      },
    },
    socialAnalysis: { type: "string" },
    commercialSeo: { type: "string" },
    revenueLeaks: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        required: ["title", "impact", "narrative"],
        properties: {
          title: { type: "string" },
          impact: { type: "string", enum: ["high", "medium", "low"] },
          narrative: { type: "string" },
        },
      },
    },
    benchmarkAnchors: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
    overallSummary: { type: "string" },
    ownerHero: {
      type: "object",
      required: [
        "revenueHeadline",
        "bookingLeakPercentLow",
        "bookingLeakPercentHigh",
        "revenueDetail",
        "customerLossBullets",
        "timelineHeadline",
        "timelinePhases",
        "comparedToLabel",
      ],
      properties: {
        revenueHeadline: { type: "string" },
        bookingLeakPercentLow: { type: "integer" },
        bookingLeakPercentHigh: { type: "integer" },
        monthlyRevenueBandLowGbp: { type: "integer" },
        monthlyRevenueBandHighGbp: { type: "integer" },
        revenueDetail: { type: "string" },
        customerLossBullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
        timelineHeadline: { type: "string" },
        timelinePhases: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            required: ["window", "outcome"],
            properties: { window: { type: "string" }, outcome: { type: "string" } },
          },
        },
        comparedToLabel: { type: "string" },
      },
    },
  },
};

export function buildPerceptionAuditContext(payload: AuditResultPayload): Record<string, unknown> {
  const pack = payload.evidencePack;
  const eng = pack?.engagementSignals;
  const peerBenchmark = buildPeerBenchmarkContext(payload);
  return {
    restaurantName: pack?.restaurantName,
    city: pack?.city,
    websiteUrl: pack?.websiteUrl,
    evidencePack: pack,
    peerBenchmark,
    engagementSignals: eng ?? null,
    foodImageAnalysis: pack?.foodImageAnalysis ?? null,
    stagehandExtraction: payload.stagehandExtraction ?? pack?.stagehandExtraction ?? null,
    visualMetrics: payload.visualMetrics ?? null,
    benchmarkV1: payload.benchmarkV1 ?? null,
    benchmarkV1Media: payload.benchmarkV1Media ?? null,
    geoLocation: payload.geoLocation ?? null,
    competitorNames: payload.competitors.slice(0, 4).map((c) => c.name),
    technicalScores: payload.scores,
    scorecardCategories: SCORECARD_CATEGORIES,
    analysisGuidance: {
      dwellSecondsHint: eng?.estimatedDwellSeconds ?? null,
      stayConnectedScore: eng?.stayConnectedScore ?? null,
      ctaAudit: eng?.ctaAudit ?? null,
      designQualityAnalysis: pack?.designQualityAnalysis ?? null,
      designQualityTier: pack?.designQualityAnalysis?.tier ?? null,
      amateurSignals: pack?.designQualityAnalysis?.amateurSignals ?? [],
      foodPhotographyScore: pack?.foodImageAnalysis?.aggregate?.foodPhotographyScore ?? null,
      blurryImageCount: pack?.foodImageAnalysis?.aggregate?.blurryCount ?? null,
      hqImageCount: pack?.foodImageAnalysis?.aggregate?.hqCount ?? null,
      realismNote:
        "Use realistic /10 scores (typically 3–8). Never score everything 1 or 10. If designQualityTier is amateur, Brand consistency and Mobile experience must be ≤ 5/10. Headline digitalPositioningScore should align with scorecard average.",
    },
  };
}

export async function runGeminiPerceptionAuditV1(
  payload: AuditResultPayload,
): Promise<{ ok: true; data: PerceptionAuditV1 } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }
  if (!payload.evidencePack) {
    return { ok: false, error: "Missing evidence pack" };
  }

  const modelName = modelSlug();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
    systemInstruction: PERCEPTION_AUDIT_V1_SYSTEM,
  });

  const context = buildPerceptionAuditContext(payload);
  const userPayload = { context, jsonSchemaHint: PERCEPTION_JSON_SCHEMA_HINT };

  const parseAttempt = (text: string) => {
    const json = JSON.parse(stripJsonFences(text)) as unknown;
    return perceptionAuditV1Schema.safeParse(normalizePerceptionJson(json));
  };

  async function generateOnce(repair?: string) {
    const parts = [
      "Produce a hospitality perception audit. Output ONE JSON object at the top level matching jsonSchemaHint exactly — use keys digitalPositioningScore, positioningTable (8 rows with area/current/ideal), perceptionGap (6 rows with metric/current/potential). British English. No markdown.",
      JSON.stringify(userPayload),
    ];
    if (repair) parts.push(`Fix validation errors and return ONLY valid JSON.\n${repair}`);
    const result = await model.generateContent(parts.join("\n\n"));
    const text = result.response.text();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  }

  try {
    let text = await generateOnce();
    let parsed = parseAttempt(text);
    if (!parsed.success) {
      const repairMsg = parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      text = await generateOnce(repairMsg);
      parsed = parseAttempt(text);
    }
    if (!parsed.success) {
      text = await generateOnce(
        `Return ONLY flat JSON with required keys at top level. positioningTable rows MUST use area, current, ideal strings. ${parsed.error.issues.slice(0, 8).map((i) => i.path.join(".")).join(", ")}`,
      );
      parsed = parseAttempt(text);
    }
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message.slice(0, 400) };
    }

    const eng = payload.evidencePack?.engagementSignals;
    const peerBenchmark = buildPeerBenchmarkContext(payload);
    const patched = {
      ...parsed.data,
      benchmarkAnchors: sanitizeBenchmarkAnchors(
        parsed.data.benchmarkAnchors,
        peerBenchmark.suggestedAnchors,
      ),
      coverHeadline:
        parsed.data.coverHeadline ??
        "Your digital experience is likely underselling your restaurant.",
      coverSubheadline:
        parsed.data.coverSubheadline ??
        "We reviewed mobile UX, menu structure, imagery, local discovery, and conversion.",
      executiveSummary: parsed.data.executiveSummary ?? buildExecutiveFallback(payload),
      visualScorecard:
        parsed.data.visualScorecard?.length === 6
          ? parsed.data.visualScorecard
          : buildScorecardFallback(payload),
      estimatedDwellSeconds: (() => {
        const fromModel = parsed.data.estimatedDwellSeconds;
        const normalized = normalizeEstimatedDwellSeconds(fromModel) as
          | { low: number; high: number; rationale: string }
          | undefined;
        if (normalized) return normalized;
        return {
          low: eng?.estimatedDwellSeconds.low ?? 8,
          high: eng?.estimatedDwellSeconds.high ?? 25,
          rationale:
            eng?.rationale.join(" ").slice(0, 400) ||
            "Estimated from content depth, imagery, and mobile signals.",
        };
      })(),
    };

    const data: PerceptionAuditV1 = {
      version: 1,
      model: modelName,
      scoredAt: new Date().toISOString(),
      ...patched,
    };
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 400) };
  }
}

export function mergePerceptionAuditIntoPayload(
  payload: AuditResultPayload,
  perception: PerceptionAuditV1,
): AuditResultPayload {
  const peerBenchmark = buildPeerBenchmarkContext(payload);
  let anchored = applyAnchoredPerceptionScore(perception, payload);
  anchored = {
    ...anchored,
    benchmarkAnchors: sanitizeBenchmarkAnchors(anchored.benchmarkAnchors, peerBenchmark.suggestedAnchors),
  };
  anchored = ensureOwnerHero(payload, anchored);
  return {
    ...payload,
    perceptionAuditV1Status: "ready",
    perceptionAuditV1: anchored,
    perceptionAuditV1Error: undefined,
    scores: {
      ...payload.scores,
      overall: anchored.digitalPositioningScore,
    },
  };
}
