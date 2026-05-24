import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload, BenchmarkV1Result } from "@/lib/audit/types";
import { BENCHMARK_V1_SYSTEM } from "@/lib/prompts/audit/benchmark-system";

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

export const benchmarkV1ResultSchema = z.object({
  seo: sectionSchema,
  websiteExperience: sectionSchema,
  brandSocialPresence: sectionSchema,
  overallSummary: z.string().max(1200).optional(),
  anchorCalibrationNote: z.string().max(500).optional(),
});

export type BenchmarkV1Parsed = z.infer<typeof benchmarkV1ResultSchema>;

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

export async function runGeminiBenchmarkV1(
  evidencePack: AuditEvidencePackV1,
): Promise<{ ok: true; data: BenchmarkV1Result } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
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
    systemInstruction: BENCHMARK_V1_SYSTEM,
  });

  const userPayload = {
    evidencePack,
    jsonSchemaHint: {
      type: "object",
      required: ["seo", "websiteExperience", "brandSocialPresence"],
      properties: {
        seo: {
          type: "object",
          required: ["score", "confidence", "checks", "topGaps", "nextActions"],
        },
        websiteExperience: {
          type: "object",
          required: ["score", "confidence", "checks", "topGaps", "nextActions"],
        },
        brandSocialPresence: {
          type: "object",
          required: ["score", "confidence", "checks", "topGaps", "nextActions"],
        },
        overallSummary: { type: "string" },
        anchorCalibrationNote: { type: "string" },
      },
    },
  };

  const parseAttempt = (text: string) => {
    const stripped = stripJsonFences(text);
    const json = JSON.parse(stripped) as unknown;
    return benchmarkV1ResultSchema.safeParse(json);
  };

  async function generateOnce(promptRepair?: string) {
    const parts: string[] = [
      "Score this restaurant using ONLY the evidencePack below. Output a single JSON object matching jsonSchemaHint.",
      JSON.stringify(userPayload),
    ];
    if (promptRepair) {
      parts.push(`Previous output failed validation. Fix and return ONLY valid JSON.\nErrors: ${promptRepair}`);
    }
    const result = await model.generateContent(parts.join("\n\n"));
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
      return {
        ok: false,
        error: `Gemini JSON validation failed: ${parsed.error.message}`,
      };
    }

    const data: BenchmarkV1Result = {
      version: 1,
      model: modelName,
      scoredAt: new Date().toISOString(),
      seo: parsed.data.seo,
      websiteExperience: parsed.data.websiteExperience,
      brandSocialPresence: parsed.data.brandSocialPresence,
      overallSummary: parsed.data.overallSummary,
      anchorCalibrationNote: parsed.data.anchorCalibrationNote,
    };

    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini request failed";
    return { ok: false, error: msg };
  }
}

const GEMINI_SCORE_CAP_DELTA = 8;

function clampScore(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Keep Gemini within ±8 of factual rubric — never drag KFC-style sites to ~42. */
function capGeminiSection(geminiScore: number, rubricBaseline: number | undefined): number {
  if (rubricBaseline == null) return clampScore(geminiScore);
  return clampScore(
    Math.min(rubricBaseline + GEMINI_SCORE_CAP_DELTA, Math.max(rubricBaseline - GEMINI_SCORE_CAP_DELTA, geminiScore)),
  );
}

/** Merge benchmark into payload; narrative from Gemini, scores capped vs rubric v2 baseline. */
export function mergeBenchmarkV1IntoPayload(
  payload: AuditResultPayload,
  benchmark: BenchmarkV1Result,
): AuditResultPayload {
  const rubric = payload.rubricV2;
  const mobile = payload.scores.mobile;
  const conversion = payload.scores.conversion;

  const seo = capGeminiSection(benchmark.seo.score, rubric?.seo);
  const design = capGeminiSection(benchmark.websiteExperience.score, rubric?.websiteExperience);
  const brand = capGeminiSection(benchmark.brandSocialPresence.score, rubric?.brandSocialPresence);

  const overall = Math.round((seo + design + brand + mobile + conversion) / 5);
  const cappedOverall = rubric ? capGeminiSection(overall, rubric.overall) : clampScore(overall);

  return {
    ...payload,
    benchmarkV1: {
      ...benchmark,
      seo: { ...benchmark.seo, score: seo },
      websiteExperience: { ...benchmark.websiteExperience, score: design },
      brandSocialPresence: { ...benchmark.brandSocialPresence, score: brand },
    },
    benchmarkV1Status: "ready",
    benchmarkV1Error: undefined,
    scoresPending: false,
    scores: {
      ...payload.scores,
      overall: cappedOverall,
      seo,
      design,
    },
  };
}
