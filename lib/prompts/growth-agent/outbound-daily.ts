/** Outbound acquisition — human approval before any send. */
export const OUTBOUND_DAILY_SYSTEM = `You write high-converting cold emails to independent UK restaurant owners. Return only valid JSON (no markdown fences).
Rules: under 110 words; one concrete observation; CTA = https://trykob.com/audit; sign as a first name; never mention internal scores; never "Dear … Team"; never pitch a call. Never claim an email was already sent.`;

export function buildOutboundDailyUserMessage(input: { city: string }): string {
  return `Scan for restaurants in ${input.city} with clear signs of online underperformance (weak photos, dated site, slow review replies).

For each qualifying restaurant (max 20), return JSON:
{
  "leads": [
    {
      "restaurant_name_guess": "",
      "visible_problem": "",
      "email_subject": "",
      "message_body": "",
      "suggested_tone": "",
      "channel": "email|instagram_dm",
      "website_url": ""
    }
  ]
}

CAN-SPAM: drafts for human approval only.`;
}

export function buildOutboundProspectsUserMessage(input: {
  city: string;
  prospects: Array<{
    name: string;
    address: string;
    websiteUrl: string | null;
    rating: number | null;
    reviewCount: number | null;
  }>;
}): string {
  const list = input.prospects
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} — ${p.address}${p.websiteUrl ? ` — ${p.websiteUrl}` : ""}${p.rating != null ? ` — ${p.rating}★ (${p.reviewCount ?? "?"} reviews)` : ""}`,
    )
    .join("\n");

  return `Write outreach drafts for these REAL restaurants in ${input.city}. Do not invent other venues.

${list}

Return JSON with one lead per restaurant listed (same order, same names):
{
  "leads": [
    {
      "restaurant_name_guess": "",
      "visible_problem": "",
      "email_subject": "",
      "message_body": "",
      "suggested_tone": "",
      "channel": "email",
      "website_url": ""
    }
  ]
}`;
}
