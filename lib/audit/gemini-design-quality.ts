import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload } from "@/lib/audit/types";
import type { FetchedMediaForVision } from "@/lib/audit/collect-media-assets";
import { DESIGN_QUALITY_V1_SYSTEM } from "@/lib/prompts/audit/design-quality-system";

export type AuditDesignQualityV1 = {
  version: 1;
  model: string;
  scoredAt: string;
  designQualityScore: number;
  tier: "premium" | "competent" | "dated" | "amateur";
  amateurSignals: string[];
  strengths: string[];
  summary: string;
  imageRefs: string[];
};

const tierSchema = z.enum(["premium", "competent", "dated", "amateur"]);

export const designQualityV1Schema = z.object({
  designQualityScore: z.number().int().min(0).max(100),
  tier: tierSchema,
  amateurSignals: z.array(z.string().min(1).max(200)).max(6),
  strengths: z.array(z.string().min(1).max(200)).max(3),
  summary: z.string().min(10).max(400),
});

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

/** Prefer og/twitter hero, then first inline img. */
export function pickDesignVisionAssets(assets: FetchedMediaForVision[]): FetchedMediaForVision[] {
  const priority = (ref: string, source: string) => {
    if (ref === "og_image" || source === "og:image") return 0;
    if (ref === "twitter_image" || source.startsWith("twitter")) return 1;
    if (ref.startsWith("img_")) return 2;
    return 3;
  };
  return [...assets]
    .sort((a, b) => priority(a.meta.ref, a.meta.source) - priority(b.meta.ref, b.meta.source))
    .slice(0, 2);
}

export async function runGeminiDesignQualityV1(
  pack: AuditEvidencePackV1,
  assets: FetchedMediaForVision[],
  screenshotUrl?: string | null,
): Promise<{ ok: true; data: AuditDesignQualityV1 } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }

  const picked = pickDesignVisionAssets(assets);
  if (picked.length === 0 && !screenshotUrl) {
    return { ok: false, error: "No hero images for design vision" };
  }

  const modelName = modelSlug();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
    systemInstruction: DESIGN_QUALITY_V1_SYSTEM,
  });

  const context = {
    restaurantName: pack.restaurantName,
    city: pack.city,
    websiteUrl: pack.websiteUrl,
    imageRefs: picked.map((a) => a.meta.ref),
    screenshotUrl: screenshotUrl ?? null,
  };

  type InlinePart = { inlineData: { mimeType: string; data: string } };

  async function generateOnce(repair?: string) {
    const parts: (string | InlinePart)[] = [
      `Score homepage/hero design quality for this UK hospitality site. JSON only.\n${JSON.stringify(context)}`,
    ];
    if (repair) parts.push(`Fix JSON: ${repair}`);
    for (const a of picked) {
      parts.push({ inlineData: { mimeType: a.meta.mimeType, data: a.base64 } });
    }
    const result = await model.generateContent(parts);
    const text = result.response.text();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  }

  try {
    let text = await generateOnce();
    let parsed = designQualityV1Schema.safeParse(JSON.parse(stripJsonFences(text)));
    if (!parsed.success) {
      text = await generateOnce(parsed.error.message.slice(0, 200));
      parsed = designQualityV1Schema.safeParse(JSON.parse(stripJsonFences(text)));
    }
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message.slice(0, 400) };
    }

    let score = parsed.data.designQualityScore;
    if (parsed.data.tier === "amateur") score = Math.min(score, 55);
    if (parsed.data.tier === "dated") score = Math.min(score, 62);

    return {
      ok: true,
      data: {
        version: 1,
        model: modelName,
        scoredAt: new Date().toISOString(),
        designQualityScore: score,
        tier: parsed.data.tier,
        amateurSignals: parsed.data.amateurSignals,
        strengths: parsed.data.strengths,
        summary: parsed.data.summary,
        imageRefs: picked.map((a) => a.meta.ref),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 400) };
  }
}

/** Deterministic headline cap from scorecard + design vision. */
export function anchorDigitalPositioningScore(input: {
  geminiSuggested: number;
  visualScorecard: { scoreOutOf10: number }[];
  designQualityScore?: number | null;
}): number {
  const rows = input.visualScorecard;
  const scorecardAvg =
    rows.length > 0
      ? Math.round((rows.reduce((a, r) => a + r.scoreOutOf10, 0) / rows.length) * 10)
      : input.geminiSuggested;

  let cap = 100;
  const design = input.designQualityScore;
  if (design != null) {
    if (design < 50) cap = Math.min(cap, 55);
    else if (design < 58) cap = Math.min(cap, 62);
    cap = Math.min(cap, design + 8);
  }

  const scorecardCap = Math.min(100, scorecardAvg + 5);
  return Math.max(
    18,
    Math.min(input.geminiSuggested, scorecardCap, cap, Math.round(scorecardAvg * 0.85 + (design ?? scorecardAvg) * 0.15)),
  );
}

export function applyAnchoredPerceptionScore(
  perception: import("@/lib/audit/types").PerceptionAuditV1,
  payload: AuditResultPayload,
): import("@/lib/audit/types").PerceptionAuditV1 {
  const design = payload.evidencePack?.designQualityAnalysis?.designQualityScore ?? null;
  const anchored = anchorDigitalPositioningScore({
    geminiSuggested: perception.digitalPositioningScore,
    visualScorecard: perception.visualScorecard ?? [],
    designQualityScore: design,
  });

  if (anchored === perception.digitalPositioningScore) return perception;

  return {
    ...perception,
    digitalPositioningScore: anchored,
    overallSummary: `${perception.overallSummary} (Headline score reflects visual scorecard and homepage design review.)`.slice(
      0,
      800,
    ),
  };
}
