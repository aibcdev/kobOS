import { geminiTextCompletion, isGeminiConfigured } from "@/lib/ai/gemini-config";
import type { AuditResultPayload } from "@/lib/audit/types";

export async function enrichAuditNarrative(payload: AuditResultPayload, context: { restaurantName: string; city: string }) {
  if (!isGeminiConfigured()) return null;

  const user = JSON.stringify({
    restaurantName: context.restaurantName,
    city: context.city,
    scores: payload.scores,
    issueTitles: payload.issues.map((i) => i.title),
  });

  const res = await geminiTextCompletion({
    system:
      "You are KOB, a premium restaurant growth consultant. Write 3 short sentences: empathetic hook, what is at stake online, one confident next step. No jargon. No markdown.",
    user,
    temperature: 0.7,
    maxOutputTokens: 220,
  });

  return res.ok ? res.text : null;
}
