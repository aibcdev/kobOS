import { geminiJsonCompletion } from "@/lib/growth-agent/gemini-json-completion";
import { parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";
import { buildOutboundAbDraft, type OutboundAbDraft } from "@/lib/outbound/email-templates-ab";
import { OutboundEmailVariant } from "@prisma/client";
import { z } from "zod";

const draftSchema = z.object({
  email_subject: z.string(),
  message_body: z.string(),
  suggested_tone: z.string(),
});

/** @deprecated Prefer OutboundAbDraft — kept for type compatibility with persist helpers. */
export type UkColdDraft = {
  email_subject: string;
  message_body: string;
  suggested_tone: string;
  variant?: OutboundEmailVariant;
};

/**
 * Primary outbound draft path: fixed A/B templates + pre-generated audit URL.
 * `stableId` should be the OutboundLead id (or prospect id before lead exists).
 */
export function generateOutboundAbEmail(input: {
  stableId: string;
  companyName: string;
  auditUrl: string;
  variant?: OutboundEmailVariant;
}): OutboundAbDraft {
  return buildOutboundAbDraft(input);
}

/** @deprecated Use generateOutboundAbEmail — Gemini path kept only as emergency fallback. */
export async function generateLeadEngineDraft(input: {
  restaurantName: string;
  city: string;
  websiteUrl: string;
  kobOpportunityScore: number;
  opportunities: string[];
  reviewCount: number | null;
  rating: number | null;
  emailAngle?: string | null;
  auditUrl?: string;
  stableId?: string;
}): Promise<{ ok: true; draft: UkColdDraft } | { ok: false; error: string }> {
  if (input.auditUrl && input.stableId) {
    const draft = generateOutboundAbEmail({
      stableId: input.stableId,
      companyName: input.restaurantName,
      auditUrl: input.auditUrl,
    });
    return {
      ok: true,
      draft: {
        email_subject: draft.email_subject,
        message_body: draft.message_body,
        suggested_tone: draft.suggested_tone,
        variant: draft.variant,
      },
    };
  }

  const hooks = input.opportunities.filter((o) => !/^Est\.\s+\d+\s+lost/i.test(o));
  const primary = hooks[0] ?? input.opportunities[0] ?? "Room to improve local Google visibility";

  const SYSTEM = `You write short B2B cold emails. Return JSON only. Under 110 words. CTA https://trykob.com/audit. Sign Tim.`;
  const user = `Restaurant: ${input.restaurantName}\nCity: ${input.city}\nHook: ${primary}`;
  const completion = await geminiJsonCompletion({ system: SYSTEM, user, temperature: 0.55 });
  if (!completion.ok) return completion;
  const parsed = parseJsonWithSchema(completion.raw, draftSchema);
  if (!parsed.ok) return parsed;
  return { ok: true, draft: parsed.data };
}

/** @deprecated Use generateOutboundAbEmail. */
export async function generateUkColdDraft(input: {
  restaurantName: string;
  city: string;
  topIssue: string;
  qualifyScore: number;
  websiteUrl: string;
  auditUrl?: string;
  stableId?: string;
}): Promise<{ ok: true; draft: UkColdDraft } | { ok: false; error: string }> {
  if (input.auditUrl && input.stableId) {
    const draft = generateOutboundAbEmail({
      stableId: input.stableId,
      companyName: input.restaurantName,
      auditUrl: input.auditUrl,
    });
    return {
      ok: true,
      draft: {
        email_subject: draft.email_subject,
        message_body: draft.message_body,
        suggested_tone: draft.suggested_tone,
        variant: draft.variant,
      },
    };
  }

  const SYSTEM = `You write short B2B cold emails. Return JSON only. Under 110 words. CTA https://trykob.com/audit. Sign Tim.`;
  const user = `Restaurant: ${input.restaurantName}\nIssue: ${input.topIssue}`;
  const completion = await geminiJsonCompletion({ system: SYSTEM, user, temperature: 0.55 });
  if (!completion.ok) return completion;
  const parsed = parseJsonWithSchema(completion.raw, draftSchema);
  if (!parsed.ok) return parsed;
  return { ok: true, draft: parsed.data };
}
