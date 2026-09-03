/** How a restaurant owner found KOB (audit + signup). */

export const HEARD_FROM_OPTIONS = [
  { value: "google", label: "Google search" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" },
  { value: "reddit", label: "Reddit" },
  { value: "referral", label: "Someone told me" },
  { value: "ads", label: "An ad" },
  { value: "other", label: "Other" },
] as const;

export type HeardFromValue = (typeof HEARD_FROM_OPTIONS)[number]["value"];

const AI_SOURCES = new Set<HeardFromValue>(["chatgpt", "claude", "gemini", "perplexity"]);

export function isAiHeardFrom(value: string | null | undefined): boolean {
  return Boolean(value && AI_SOURCES.has(value as HeardFromValue));
}

export const HEARD_FROM_STORAGE_KEY = "kob_heard_from_v1";

export type HeardFromPayload = {
  heardFrom?: string;
  aiPrompt?: string;
};

export function parseHeardFrom(raw: unknown): HeardFromPayload {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const heardFrom = typeof o.heardFrom === "string" ? o.heardFrom.trim().slice(0, 40) : "";
  const allowed = new Set(HEARD_FROM_OPTIONS.map((x) => x.value));
  const aiPrompt = typeof o.aiPrompt === "string" ? o.aiPrompt.trim().slice(0, 2000) : "";
  return {
    heardFrom: heardFrom && allowed.has(heardFrom as HeardFromValue) ? heardFrom : undefined,
    aiPrompt: aiPrompt || undefined,
  };
}

export function readStoredHeardFrom(): HeardFromPayload {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(HEARD_FROM_STORAGE_KEY);
    if (!raw) return {};
    return parseHeardFrom(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function storeHeardFrom(payload: HeardFromPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HEARD_FROM_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
