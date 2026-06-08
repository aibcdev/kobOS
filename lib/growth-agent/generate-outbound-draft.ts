import {
  discoverProspectsInCity,
  isOutboundPlacesDiscoveryEnabled,
} from "@/lib/outbound/discover-prospects";
import {
  OUTBOUND_DAILY_SYSTEM,
  buildOutboundDailyUserMessage,
  buildOutboundProspectsUserMessage,
} from "@/lib/prompts/growth-agent/outbound-daily";
import { outboundDraftJsonSchema, type OutboundDraftJson } from "@/lib/growth-agent/outbound-draft-schema";
import { openaiJsonCompletion, parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";

export type OutboundDraftResult =
  | { ok: true; data: OutboundDraftJson; source: "places" | "ai_scan" }
  | { ok: false; error: string };

export async function generateOutboundDraft(input: { city: string; max?: number }): Promise<OutboundDraftResult> {
  const city = input.city.trim();
  if (!city) {
    return { ok: false, error: "City is required" };
  }

  const max = Math.min(20, Math.max(1, input.max ?? 20));

  let user: string;
  let source: "places" | "ai_scan" = "ai_scan";

  if (isOutboundPlacesDiscoveryEnabled()) {
    const prospects = await discoverProspectsInCity(city, max);
    if (prospects.length > 0) {
      source = "places";
      user = buildOutboundProspectsUserMessage({
        city,
        prospects: prospects.map((p) => ({
          name: p.name,
          address: p.formattedAddress,
          websiteUrl: p.websiteUrl,
          rating: p.rating,
          reviewCount: p.userRatingCount,
        })),
      });
    } else {
      user = `${buildOutboundDailyUserMessage({ city })}\n\nReturn at most ${max} leads.`;
    }
  } else {
    user = `${buildOutboundDailyUserMessage({ city })}\n\nReturn at most ${max} leads.`;
  }

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
  return { ok: true, data: { leads }, source };
}
