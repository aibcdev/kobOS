import OpenAI from "openai";
import type { z } from "zod";

export async function openaiJsonCompletion(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured" };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await client.chat.completions.create({
      model,
      temperature: args.temperature ?? 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    });

    const raw = res.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { ok: false, error: "Empty model response" };
    }
    return { ok: true, raw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    return { ok: false, error: msg };
  }
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
