import {
  OUTBOUND_DAILY_SYSTEM,
  buildOutboundDailyUserMessage,
} from "@/lib/prompts/growth-agent/outbound-daily";
import { outboundDraftJsonSchema, type OutboundDraftJson } from "@/lib/growth-agent/outbound-draft-schema";
import { openaiJsonCompletion, parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";

export type OutboundDraftResult = { ok: true; data: OutboundDraftJson } | { ok: false; error: string };

export async function generateOutboundDraft(input: { city: string; max?: number }): Promise<OutboundDraftResult> {
  const city = input.city.trim();
  if (!city) {
    return { ok: false, error: "City is required" };
  }

  const max = Math.min(20, Math.max(1, input.max ?? 20));
  const user = `${buildOutboundDailyUserMessage({ city })}\n\nReturn at most ${max} leads.`;

  const completion = await openaiJsonCompletion({
    system: OUTBOUND_DAILY_SYSTEM,
    user,
    temperature: 0.7,
  });
  if (!completion.ok) {
    return completion;
  }

  const parsed = parseJsonWithSchema(completion.raw, outboundDraftJsonSchema);
  if (!parsed.ok) {
    return parsed;
  }

  const leads = parsed.data.leads.slice(0, max);
  return { ok: true, data: { leads } };
}
