import type { Prisma } from "@prisma/client";

import { fetchMediaAssetsForVision } from "@/lib/audit/collect-media-assets";
import { runGeminiDesignQualityV1 } from "@/lib/audit/gemini-design-quality";
import {
  mergeBenchmarkV1MediaIntoPayload,
  runGeminiBenchmarkV1Media,
} from "@/lib/audit/gemini-benchmark-media";
import { mergeBenchmarkV1IntoPayload, runGeminiBenchmarkV1 } from "@/lib/audit/gemini-benchmark-score";
import {
  buildHeuristicPerceptionAuditV1,
  mergePerceptionAuditIntoPayload,
  runGeminiPerceptionAuditV1,
} from "@/lib/audit/gemini-perception-audit";
import { parseAuditPayload, type AuditResultPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

/** Cap Gemini perception so Overview never waits on a hung model call. */
export const PERCEPTION_TIMEOUT_MS = 30_000;

export async function persistAuditResultPayload(
  auditId: string,
  payload: AuditResultPayload,
): Promise<void> {
  await prisma.visibilityAudit.update({
    where: { id: auditId },
    data: {
      resultPayload: payload as Prisma.InputJsonValue,
      overallScore: payload.scores.overall,
      seoScore: payload.scores.seo,
      designScore: payload.scores.design,
      mobileScore: payload.scores.mobile,
      conversionScore: payload.scores.conversion,
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Always leave perception in a showable state (Gemini or heuristic). */
export function resolvePerceptionIntoPayload(
  payload: AuditResultPayload,
  gemini:
    | { ok: true; data: import("@/lib/audit/types").PerceptionAuditV1 }
    | { ok: false; error: string }
    | null,
): AuditResultPayload {
  if (gemini?.ok) {
    return mergePerceptionAuditIntoPayload(payload, gemini.data);
  }
  const heuristic = buildHeuristicPerceptionAuditV1(payload);
  const merged = mergePerceptionAuditIntoPayload(payload, heuristic);
  return {
    ...merged,
    perceptionAuditV1Error: gemini?.error ?? "Used fast heuristic summary",
  };
}

export async function runPerceptionIntoPayload(
  payload: AuditResultPayload,
  timeoutMs = PERCEPTION_TIMEOUT_MS,
): Promise<AuditResultPayload> {
  if (!payload.evidencePack) {
    return resolvePerceptionIntoPayload(payload, {
      ok: false,
      error: "Missing evidence pack",
    });
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return resolvePerceptionIntoPayload(payload, {
      ok: false,
      error: "GEMINI_API_KEY is not configured",
    });
  }

  try {
    const gemini = await withTimeout(
      runGeminiPerceptionAuditV1(payload),
      timeoutMs,
      "perception",
    );
    return resolvePerceptionIntoPayload(payload, gemini);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return resolvePerceptionIntoPayload(payload, { ok: false, error: msg.slice(0, 400) });
  }
}

export async function loadAuditPayload(
  auditId: string,
): Promise<{ ok: true; payload: AuditResultPayload } | { ok: false; reason: string }> {
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: auditId } });
  if (!audit) return { ok: false, reason: "not_found" };
  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) return { ok: false, reason: "invalid_payload" };
  return { ok: true, payload };
}

/**
 * Step 1 — Overview score + owner summary. Writes immediately so the UI can leave “Analysing…”.
 */
export async function runAndPersistPerceptionStep(
  auditId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const loaded = await loadAuditPayload(auditId);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  if (!loaded.payload.evidencePack) {
    const failed: AuditResultPayload = {
      ...loaded.payload,
      perceptionAuditV1Status: "failed",
      perceptionAuditV1Error: "Missing evidence pack",
      perceptionAuditV1: null,
      benchmarkV1Status: loaded.payload.benchmarkV1Status === "pending" ? "failed" : loaded.payload.benchmarkV1Status,
      benchmarkV1Error: loaded.payload.benchmarkV1Status === "pending" ? "Missing evidence pack" : loaded.payload.benchmarkV1Error,
      benchmarkV1MediaStatus:
        loaded.payload.benchmarkV1MediaStatus === "pending" ? "skipped" : loaded.payload.benchmarkV1MediaStatus,
    };
    // Still give Overview something to show
    const withPerception = resolvePerceptionIntoPayload(failed, {
      ok: false,
      error: "Missing evidence pack",
    });
    await persistAuditResultPayload(auditId, withPerception);
    return { ok: false, reason: "no_evidence_pack" };
  }

  const next = await runPerceptionIntoPayload(loaded.payload);
  await persistAuditResultPayload(auditId, next);
  return { ok: true };
}

/**
 * Step 2 — Text benchmark (does not block Overview if perception already ready).
 */
export async function runAndPersistBenchmarkTextStep(
  auditId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const loaded = await loadAuditPayload(auditId);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const payload = loaded.payload;
  if (!payload.evidencePack) {
    const next: AuditResultPayload = {
      ...payload,
      benchmarkV1Status: "failed",
      benchmarkV1Error: "Missing evidence pack",
      benchmarkV1: null,
      benchmarkV1MediaStatus: "skipped",
      benchmarkV1Media: null,
    };
    await persistAuditResultPayload(auditId, next);
    return { ok: false, reason: "no_evidence_pack" };
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    const next: AuditResultPayload = {
      ...payload,
      benchmarkV1Status: "failed",
      benchmarkV1Error: "GEMINI_API_KEY is not configured",
      benchmarkV1: null,
      benchmarkV1MediaStatus: "skipped",
      benchmarkV1Media: null,
    };
    await persistAuditResultPayload(auditId, next);
    return { ok: false, reason: "no_gemini_key" };
  }

  const result = await runGeminiBenchmarkV1(payload.evidencePack);
  let merged: AuditResultPayload;
  if (!result.ok) {
    merged = {
      ...payload,
      benchmarkV1Status: "failed",
      benchmarkV1Error: result.error,
      benchmarkV1: null,
    };
  } else {
    merged = mergeBenchmarkV1IntoPayload(payload, result.data);
  }
  await persistAuditResultPayload(auditId, merged);
  return { ok: result.ok };
}

/**
 * Step 3 — Media / design vision (slowest; Overview already unblocked).
 */
export async function runAndPersistBenchmarkMediaStep(
  auditId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const loaded = await loadAuditPayload(auditId);
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  let merged: AuditResultPayload = loaded.payload;
  if (!merged.evidencePack) {
    merged = {
      ...merged,
      benchmarkV1MediaStatus: "skipped",
      benchmarkV1Media: null,
    };
    await persistAuditResultPayload(auditId, merged);
    return { ok: false, reason: "no_evidence_pack" };
  }

  const candidates = merged.evidencePack.imageCandidates ?? [];
  if (candidates.length === 0) {
    merged = {
      ...merged,
      benchmarkV1MediaStatus: "skipped",
      benchmarkV1Media: null,
      benchmarkV1MediaError: undefined,
    };
    await persistAuditResultPayload(auditId, merged);
    return { ok: true, reason: "no_candidates" };
  }

  const { assets, errors } = await fetchMediaAssetsForVision(candidates, 6);
  const foodImageAnalysis = assets.length
    ? await (async () => {
        const { analyzeFoodImagesFromBuffers } = await import("@/lib/audit/analyze-food-images");
        return analyzeFoodImagesFromBuffers(assets);
      })()
    : undefined;

  merged = {
    ...merged,
    evidencePack: {
      ...merged.evidencePack,
      version: 2,
      mediaAssetsMeta: assets.map((a) => a.meta),
      ...(foodImageAnalysis ? { foodImageAnalysis } : {}),
    },
  };

  if (assets.length === 0) {
    merged = {
      ...merged,
      benchmarkV1MediaStatus: "failed",
      benchmarkV1Media: null,
      benchmarkV1MediaError: errors.length ? errors.join("; ") : "Could not fetch images for vision scoring",
    };
    await persistAuditResultPayload(auditId, merged);
    return { ok: false, reason: "no_assets" };
  }

  const pack = merged.evidencePack;
  if (!pack) {
    merged = {
      ...merged,
      benchmarkV1MediaStatus: "skipped",
      benchmarkV1Media: null,
    };
    await persistAuditResultPayload(auditId, merged);
    return { ok: false, reason: "no_evidence_pack" };
  }

  const designRes = await runGeminiDesignQualityV1(
    pack,
    assets,
    merged.browserbaseScan?.screenshotPublicUrl,
  );
  if (designRes.ok) {
    merged = {
      ...merged,
      evidencePack: {
        ...pack,
        designQualityAnalysis: designRes.data,
      },
    };
  }

  const mediaRes = await runGeminiBenchmarkV1Media(merged.evidencePack ?? pack, assets);
  if (!mediaRes.ok) {
    merged = {
      ...merged,
      benchmarkV1MediaStatus: "failed",
      benchmarkV1Media: null,
      benchmarkV1MediaError: mediaRes.error,
    };
  } else {
    merged = mergeBenchmarkV1MediaIntoPayload(merged, mediaRes.data);
  }

  await persistAuditResultPayload(auditId, merged);
  return { ok: mediaRes.ok };
}

/** Mark AI statuses failed + heuristic perception when Gemini cannot run at all. */
export async function markAiJobsUnavailable(
  auditId: string,
  reason: string,
): Promise<void> {
  const loaded = await loadAuditPayload(auditId);
  if (!loaded.ok) return;
  let next: AuditResultPayload = {
    ...loaded.payload,
    benchmarkV1Status: loaded.payload.benchmarkV1Status === "pending" ? "failed" : loaded.payload.benchmarkV1Status,
    benchmarkV1Error: loaded.payload.benchmarkV1Status === "pending" ? reason : loaded.payload.benchmarkV1Error,
    benchmarkV1MediaStatus:
      loaded.payload.benchmarkV1MediaStatus === "pending" ? "skipped" : loaded.payload.benchmarkV1MediaStatus,
  };
  if (loaded.payload.perceptionAuditV1Status === "pending" || !loaded.payload.perceptionAuditV1) {
    next = resolvePerceptionIntoPayload(next, { ok: false, error: reason });
  }
  await persistAuditResultPayload(auditId, next);
}

/**
 * Full progressive AI suite (perception → text → media). Used by Inngest steps and inline fallback.
 */
export async function runAndPersistGeminiAuditSuite(auditId: string): Promise<{
  perception: boolean;
  benchmark: boolean;
  media: boolean;
}> {
  const perception = await runAndPersistPerceptionStep(auditId);
  const benchmark = await runAndPersistBenchmarkTextStep(auditId);
  const media = await runAndPersistBenchmarkMediaStep(auditId);
  return { perception: perception.ok, benchmark: benchmark.ok, media: media.ok };
}
