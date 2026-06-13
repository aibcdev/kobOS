import type { z } from "zod";
import { geminiJsonCompletion } from "@/lib/ai/gemini-config";

/** @deprecated Use geminiJsonCompletion — kept for existing imports. */
export async function openaiJsonCompletion(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  return geminiJsonCompletion(args);
}

export function parseJsonWithSchema<T>(raw: string, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model returned non-JSON" };
  }

  const checked = schema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "JSON failed validation" };
  }
  return { ok: true, data: checked.data };
}
