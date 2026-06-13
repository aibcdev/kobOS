import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload, BenchmarkV1MediaResult } from "@/lib/audit/types";
import { BENCHMARK_V1_MEDIA_SYSTEM } from "@/lib/prompts/audit/benchmark-media-system";
import type { FetchedMediaForVision } from "@/lib/audit/collect-media-assets";

const confidenceSchema = z.enum(["low", "medium", "high"]);

const checkSchema = z.object({
  id: z.string().min(1).max(80),
  pass: z.boolean(),
  detail: z.string().min(1).max(600),
  evidenceRef: z.string().min(1).max(200),
});

const sectionSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: confidenceSchema,
  checks: z.array(checkSchema).min(1).max(25),
  topGaps: z.array(z.string().min(1).max(400)).max(8),
  nextActions: z.array(z.string().min(1).max(400)).max(8),
});

export const benchmarkV1MediaResultSchema = z.object({
  visualBrandQuality: sectionSchema,
  videoPresentationQuality: sectionSchema.optional(),
  visualSummary: z.string().max(800).optional(),
  videoSummary: z.string().max(800).optional(),
});

export type BenchmarkV1MediaParsed = z.infer<typeof benchmarkV1MediaResultSchema>;

function modelSlug() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

function normalizeCheck(raw: unknown, index: number) {
  if (typeof raw === "string") {
    const detail = raw.trim().slice(0, 600);
    if (!detail) return null;
    return {
      id: `visual_check_${index + 1}`,
      pass: true,
      detail,
      evidenceRef: "mediaAssetsMeta",
    };
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const detail =
    typeof o.detail === "string"
      ? o.detail
      : typeof o.message === "string"
        ? o.message
        : typeof o.summary === "string"
          ? o.summary
          : "";
  if (!detail.trim()) return null;
  const passRaw = o.pass;
  const pass =
    typeof passRaw === "boolean"
      ? passRaw
      : typeof passRaw === "string" && /^(true|pass|yes|1)$/i.test(passRaw.trim());
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 80) : `visual_check_${index + 1}`,
    pass,
    detail: detail.trim().slice(0, 600),
    evidenceRef:
      typeof o.evidenceRef === "string" && o.evidenceRef.trim()
        ? o.evidenceRef.trim().slice(0, 200)
        : "mediaAssetsMeta",
  };
}

function normalizeSection(raw: unknown) {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const checksRaw = Array.isArray(o.checks) ? o.checks : [];
  let checks = checksRaw.map((c, i) => normalizeCheck(c, i)).filter((c): c is NonNullable<typeof c> => c != null);
  if (checks.length === 0) {
    checks = [
      {
        id: "visual_overview",
        pass: true,
        detail: "Visual review completed from attached images.",
        evidenceRef: "mediaAssetsMeta[0]",
      },
    ];
  }
  const scoreNum =
    typeof o.score === "number"
      ? o.score
      : typeof o.score === "string"
        ? Number.parseInt(o.score, 10)
        : 0;
  const confidenceRaw = String(o.confidence ?? "medium").toLowerCase();
  const confidence = confidenceRaw === "low" || confidenceRaw === "high" ? confidenceRaw : "medium";
  return {
    ...o,
    score: Math.min(100, Math.max(0, Math.round(Number.isFinite(scoreNum) ? scoreNum : 0))),
    confidence,
    checks,
    topGaps: Array.isArray(o.topGaps) ? o.topGaps.map((g) => String(g).trim()).filter(Boolean).slice(0, 8) : [],
    nextActions: Array.isArray(o.nextActions)
      ? o.nextActions.map((a) => String(a).trim()).filter(Boolean).slice(0, 8)
      : [],
  };
}

/** Coerce common Gemini shape drift before Zod validation. */
export function normalizeBenchmarkV1MediaJson(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const o = json as Record<string, unknown>;
  const out: Record<string, unknown> = {
    ...o,
    visualBrandQuality: normalizeSection(o.visualBrandQuality),
    visualSummary: typeof o.visualSummary === "string" ? o.visualSummary.slice(0, 800) : undefined,
    videoSummary: typeof o.videoSummary === "string" ? o.videoSummary.slice(0, 800) : undefined,
  };
  if (o.videoPresentationQuality) {
    out.videoPresentationQuality = normalizeSection(o.videoPresentationQuality);
  }
  return out;
}

type InlinePart = { inlineData: { mimeType: string; data: string } };

export async function runGeminiBenchmarkV1Media(
  evidencePack: AuditEvidencePackV1,
  fetched: FetchedMediaForVision[],
): Promise<{ ok: true; data: BenchmarkV1MediaResult } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }
  if (!fetched.length) {
    return { ok: false, error: "No images to score" };
  }

  const modelName = modelSlug();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.28,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
    systemInstruction: BENCHMARK_V1_MEDIA_SYSTEM,
  });

  const videoPosters =
    evidencePack.imageCandidates?.filter((c) => c.source === "video:poster").map((c) => c.url) ?? [];
  const hasVideoPosters = videoPosters.length > 0;

  const contextJson = {
    restaurantName: evidencePack.restaurantName,
    city: evidencePack.city,
    websiteUrl: evidencePack.websiteUrl,
    urlSignals: evidencePack.urlSignals,
    mediaAssetsMeta: fetched.map((f) => f.meta),
    foodImageAnalysis: evidencePack.foodImageAnalysis ?? null,
    sharpnessTiers: evidencePack.foodImageAnalysis?.images.map((i) => ({
      ref: i.ref,
      tier: i.qualityTier,
      sharpnessScore: i.sharpnessScore,
    })),
    videoPosters,
    hasVideoPosters,
    videoAnalysisNote:
      "Score videoPresentationQuality from video poster frames and page markup context only — not a full video transcode.",
    jsonSchemaHint: {
      required: hasVideoPosters ? ["visualBrandQuality", "videoPresentationQuality"] : ["visualBrandQuality"],
      properties: {
        visualBrandQuality: {
          type: "object",
          required: ["score", "confidence", "checks", "topGaps", "nextActions"],
        },
        videoPresentationQuality: {
          type: "object",
          required: ["score", "confidence", "checks", "topGaps", "nextActions"],
        },
        visualSummary: { type: "string" },
        videoSummary: { type: "string" },
      },
    },
    attachmentOrder: "Images after this message appear in the same order as mediaAssetsMeta.",
  };

  const parseAttempt = (text: string) => {
    const stripped = stripJsonFences(text);
    const json = JSON.parse(stripped) as unknown;
    return benchmarkV1MediaResultSchema.safeParse(normalizeBenchmarkV1MediaJson(json));
  };

  async function generateOnce(promptRepair?: string) {
    const preamble = [
      "Score visualBrandQuality using the JSON context and the attached images (same order as mediaAssetsMeta). Output a single JSON object matching jsonSchemaHint.",
      JSON.stringify(contextJson),
    ];
    if (promptRepair) {
      preamble.push(`Previous output failed validation. Fix and return ONLY valid JSON.\nErrors: ${promptRepair}`);
    }
    const textIntro = preamble.join("\n\n");

    const inlineParts: InlinePart[] = fetched.map((f) => ({
      inlineData: { mimeType: f.meta.mimeType, data: f.base64 },
    }));

    const result = await model.generateContent([textIntro, ...inlineParts]);
    const text = result.response.text();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  }

  try {
    let text = await generateOnce();
    let parsed = parseAttempt(text);
    if (!parsed.success) {
      const repairMsg = parsed.error.issues.slice(0, 12).map((i) => i.message).join("; ");
      text = await generateOnce(repairMsg);
      parsed = parseAttempt(text);
    }
    if (!parsed.success) {
      return { ok: false, error: `Gemini media JSON validation failed: ${parsed.error.message}` };
    }

    const data: BenchmarkV1MediaResult = {
      version: 1,
      model: modelName,
      scoredAt: new Date().toISOString(),
      visualBrandQuality: parsed.data.visualBrandQuality,
      visualSummary: parsed.data.visualSummary,
      ...(parsed.data.videoPresentationQuality
        ? { videoPresentationQuality: parsed.data.videoPresentationQuality }
        : {}),
      ...(parsed.data.videoSummary ? { videoSummary: parsed.data.videoSummary } : {}),
    };
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini media request failed";
    return { ok: false, error: msg };
  }
}

/** Blend visual score into headline design + overall (six-way average with text pillars). */
export function mergeBenchmarkV1MediaIntoPayload(
  payload: AuditResultPayload,
  media: BenchmarkV1MediaResult,
): AuditResultPayload {
  const b = payload.benchmarkV1;
  if (!b) {
    return {
      ...payload,
      benchmarkV1Media: media,
      benchmarkV1MediaStatus: "ready",
      benchmarkV1MediaError: undefined,
    };
  }

  const visual = media.visualBrandQuality.score;
  const foodScore = payload.evidencePack?.foodImageAnalysis?.aggregate.foodPhotographyScore;
  const blendedVisual = foodScore != null ? Math.round(visual * 0.55 + foodScore * 0.45) : visual;
  const web = b.websiteExperience.score;
  const blendedDesign = Math.round(Math.min(100, Math.max(0, web * 0.55 + blendedVisual * 0.45)));

  const overall = Math.round(
    (b.seo.score + b.websiteExperience.score + b.brandSocialPresence.score + payload.scores.mobile + payload.scores.conversion + blendedVisual) / 6,
  );

  return {
    ...payload,
    benchmarkV1Media: media,
    benchmarkV1MediaStatus: "ready",
    benchmarkV1MediaError: undefined,
    scores: {
      ...payload.scores,
      overall: Math.min(100, Math.max(0, overall)),
      design: blendedDesign,
    },
  };
}
