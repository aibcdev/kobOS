import OpenAI from "openai";
import type { AuditResultPayload } from "@/lib/audit/types";

export async function enrichAuditNarrative(payload: AuditResultPayload, context: { restaurantName: string; city: string }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const client = new OpenAI({ apiKey: key });
  const user = JSON.stringify({
    restaurantName: context.restaurantName,
    city: context.city,
    scores: payload.scores,
    issueTitles: payload.issues.map((i) => i.title),
  });

  const res = await client.chat.completions.create({
    model: process.env.OPENAI_AUDIT_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are KOB, a premium restaurant growth consultant. Write 3 short sentences: empathetic hook, what is at stake online, one confident next step. No jargon. No markdown.",
      },
      { role: "user", content: user },
    ],
    max_tokens: 220,
    temperature: 0.7,
  });

  const text = res.choices[0]?.message?.content?.trim();
  return text || null;
}
