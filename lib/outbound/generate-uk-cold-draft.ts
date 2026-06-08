import { geminiJsonCompletion } from "@/lib/growth-agent/gemini-json-completion";
import { openaiJsonCompletion } from "@/lib/growth-agent/openai-json-completion";
import { parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";
import { z } from "zod";

const draftSchema = z.object({
  email_subject: z.string(),
  message_body: z.string(),
  suggested_tone: z.string(),
});

export type UkColdDraft = z.infer<typeof draftSchema>;

const SYSTEM = `You write short, helpful B2B cold emails to independent UK restaurant owners.
Return JSON only. Under 160 words in message_body. Mention one specific visibility issue from the brief.
Include a line offering a free visibility scan. Do not claim you already emailed them. Professional, not pushy.`;

export async function generateUkColdDraft(input: {
  restaurantName: string;
  city: string;
  topIssue: string;
  qualifyScore: number;
  websiteUrl: string;
}): Promise<{ ok: true; draft: UkColdDraft } | { ok: false; error: string }> {
  const user = `Restaurant: ${input.restaurantName}
City: ${input.city}
Website: ${input.websiteUrl}
Visibility score (our quick check): ${input.qualifyScore}/100 — weaker is worse
Top issue: ${input.topIssue}

Return JSON: { "email_subject": "", "message_body": "", "suggested_tone": "" }`;

  const completion = process.env.OPENAI_API_KEY?.trim()
    ? await openaiJsonCompletion({ system: SYSTEM, user, temperature: 0.65 })
    : await geminiJsonCompletion({ system: SYSTEM, user, temperature: 0.65 });
  if (!completion.ok) return completion;

  const parsed = parseJsonWithSchema(completion.raw, draftSchema);
  if (!parsed.ok) return parsed;

  const footer =
    "\n\n—\nIf you'd rather not hear from us, reply \"unsubscribe\" and we won't follow up.";

  return {
    ok: true,
    draft: {
      ...parsed.data,
      message_body: parsed.data.message_body.trim() + footer,
    },
  };
}
