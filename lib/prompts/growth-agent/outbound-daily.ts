/** Phase 2 — outbound acquisition scan (human approval before send). */
export const OUTBOUND_DAILY_SYSTEM = `You scan a local market for restaurants showing online underperformance (weak food photos, dated sites, low review velocity or poor responses).
Return only valid JSON (no fences). Max 20 leads. Messages must feel helpful, not salesy; reference one specific visible problem.`;

export function buildOutboundDailyUserMessage(input: { city: string }): string {
  return `Scan for restaurants in ${input.city} with clear signs of online underperformance.

For each qualifying restaurant (max 20), return JSON:
{
  "leads": [
    {
      "restaurant_name_guess": "",
      "visible_problem": "",
      "email_subject": "",
      "message_body": "",
      "suggested_tone": "",
      "channel": "email|instagram_dm"
    }
  ]
}

CAN-SPAM / anti-spam: these are drafts for human approval only — never claim they were sent.`;

}
