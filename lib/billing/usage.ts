import { prisma } from "@/lib/db/prisma";

/**
 * Spec 2 Phase 9 cost accounting: every metered call KOB pays for on a restaurant's behalf becomes a UsageEvent priced
 * in USD micros at record time. Recording never throws; a lost cost row must not break the owner's request.
 */

export const PRICE_VERSION = "2026-10";

/** USD per 1M tokens, which is also micros per token. Paid-tier list prices. */
const LLM_PRICES: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};
/** Unknown models are priced as the dearest known one, so cost is overstated rather than missed. */
const FALLBACK_LLM_PRICE = LLM_PRICES["gemini-2.5-pro"];

/** USD micros per generated image. */
const IMAGE_PRICE_MICROS = 39_000;

export function llmCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(LLM_PRICES)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(`${k}-`));
  const p = key ? LLM_PRICES[key] : FALLBACK_LLM_PRICE;
  return Math.ceil(Math.max(0, inputTokens) * p.input + Math.max(0, outputTokens) * p.output);
}

export type UsageInput = {
  restaurantId: string | null | undefined;
  kind: "LLM" | "IMAGE" | "SMS" | "VOICE";
  provider: string;
  model?: string | null;
  inputUnits?: number;
  outputUnits?: number;
  costMicros: number;
  source: string;
  occurredAt?: Date;
};

export async function recordUsage(u: UsageInput): Promise<void> {
  if (!u.restaurantId) return;
  try {
    await prisma.usageEvent.create({
      data: {
        restaurantId: u.restaurantId,
        kind: u.kind,
        provider: u.provider,
        model: u.model ?? null,
        inputUnits: Math.max(0, Math.round(u.inputUnits ?? 0)),
        outputUnits: Math.max(0, Math.round(u.outputUnits ?? 0)),
        costMicros: BigInt(Math.max(0, Math.ceil(u.costMicros))),
        priceVersion: PRICE_VERSION,
        source: u.source,
        occurredAt: u.occurredAt ?? new Date(),
      },
    });
  } catch (err) {
    console.warn(`[usage] not recorded (${u.kind} ${u.source})`, err instanceof Error ? err.message : err);
  }
}

/** Token usage as reported by the AI SDK (`totalUsage`) or Gemini (`usageMetadata`). */
export async function recordLlmUsage(
  restaurantId: string | null | undefined,
  model: string,
  usage: { inputTokens?: number | null; outputTokens?: number | null } | null | undefined,
  source: string,
): Promise<void> {
  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  if (!input && !output) return;
  await recordUsage({ restaurantId, kind: "LLM", provider: "GEMINI", model, inputUnits: input, outputUnits: output, costMicros: llmCostMicros(model, input, output), source });
}

export async function recordImageUsage(restaurantId: string | null | undefined, model: string, source: string): Promise<void> {
  await recordUsage({ restaurantId, kind: "IMAGE", provider: "GEMINI", model, outputUnits: 1, costMicros: IMAGE_PRICE_MICROS, source });
}
