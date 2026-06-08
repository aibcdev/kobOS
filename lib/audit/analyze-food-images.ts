import sharp from "sharp";
import type { FetchedMediaForVision } from "@/lib/audit/collect-media-assets";

export type FoodImageQualityTier = "hq" | "acceptable" | "soft" | "blurry";

export type AuditFoodImageEntry = {
  ref: string;
  url: string;
  width: number;
  height: number;
  megapixels: number;
  /** Laplacian variance proxy — higher = sharper (0–100 scaled). */
  sharpnessScore: number;
  qualityTier: FoodImageQualityTier;
};

export type AuditFoodImageAnalysis = {
  version: 1;
  computedAt: string;
  analyzedCount: number;
  images: AuditFoodImageEntry[];
  aggregate: {
    avgSharpness: number;
    hqCount: number;
    blurryCount: number;
    /** 0–100 vs premium UK hospitality food photography bar. */
    foodPhotographyScore: number;
    benchmarkNote: string;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Laplacian variance — standard no-reference sharpness proxy. */
async function laplacianVariance(buf: Buffer): Promise<number> {
  const { data } = await sharp(buf)
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    sum += v;
    sumSq += v * v;
  }
  const n = data.length || 1;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function tierFromSharpness(variance: number, width: number, height: number): FoodImageQualityTier {
  const mp = (width * height) / 1_000_000;
  const small = width < 600 || height < 400;

  if (variance >= 420 && mp >= 0.35 && !small) return "hq";
  if (variance >= 180 && mp >= 0.12) return "acceptable";
  if (variance >= 70) return "soft";
  return "blurry";
}

function sharpnessScore100(variance: number): number {
  return clamp(Math.round(variance / 6), 0, 100);
}

function aggregateFoodScore(images: AuditFoodImageEntry[]): AuditFoodImageAnalysis["aggregate"] {
  if (images.length === 0) {
    return {
      avgSharpness: 0,
      hqCount: 0,
      blurryCount: 0,
      foodPhotographyScore: 15,
      benchmarkNote:
        "No food imagery could be fetched — guests see an empty visual story compared with stronger multi-site peers nearby.",
    };
  }

  const avgSharpness = Math.round(
    images.reduce((a, i) => a + i.sharpnessScore, 0) / images.length,
  );
  const hqCount = images.filter((i) => i.qualityTier === "hq").length;
  const blurryCount = images.filter((i) => i.qualityTier === "blurry" || i.qualityTier === "soft").length;

  let score = avgSharpness * 0.45;
  score += (hqCount / images.length) * 35;
  score -= (blurryCount / images.length) * 25;
  score += Math.min(12, images.length * 3);
  score = clamp(Math.round(score), 8, 96);

  let benchmarkNote: string;
  if (hqCount >= 2 && avgSharpness >= 55) {
    benchmarkNote = "Several images meet premium hospitality bar — lighting and resolution hold up against top UK brands.";
  } else if (blurryCount >= images.length / 2) {
    benchmarkNote =
      "Multiple soft or blurry images undermine appetite appeal — well below editorial food photography standards.";
  } else if (hqCount === 0) {
    benchmarkNote =
      "No hero-quality food shots detected — competitors with crisp, warm imagery will feel more premium online.";
  } else {
    benchmarkNote =
      "Mixed image quality — a few strong assets, but not consistent with best-in-class restaurant marketing.";
  }

  return { avgSharpness, hqCount, blurryCount, foodPhotographyScore: score, benchmarkNote };
}

export async function analyzeFoodImagesFromBuffers(
  fetched: FetchedMediaForVision[],
): Promise<AuditFoodImageAnalysis> {
  const images: AuditFoodImageEntry[] = [];

  for (const f of fetched) {
    try {
      const buf = Buffer.from(f.base64, "base64");
      const meta = await sharp(buf).metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      const variance = await laplacianVariance(buf);
      const sharpness = sharpnessScore100(variance);
      const tier = tierFromSharpness(variance, width, height);

      images.push({
        ref: f.meta.ref,
        url: f.meta.url,
        width,
        height,
        megapixels: Math.round(((width * height) / 1_000_000) * 100) / 100,
        sharpnessScore: sharpness,
        qualityTier: tier,
      });
    } catch {
      /* skip unreadable asset */
    }
  }

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    analyzedCount: images.length,
    images,
    aggregate: aggregateFoodScore(images),
  };
}
