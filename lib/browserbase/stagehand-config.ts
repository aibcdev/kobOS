import { isGeminiConfigured } from "@/lib/ai/gemini-config";

/** Lightweight check — safe to import from Inngest route (no Stagehand SDK). */
export function isStagehandAuditEnabled(): boolean {
  if (process.env.AUDIT_STAGEHAND === "0") return false;
  const hasBrowserbase = Boolean(process.env.BROWSERBASE_API_KEY?.trim());
  const hasLlm = Boolean(
    isGeminiConfigured() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim(),
  );
  if (!hasBrowserbase || !hasLlm) return false;
  if (process.env.AUDIT_STAGEHAND === "1") return true;
  return hasBrowserbase;
}
