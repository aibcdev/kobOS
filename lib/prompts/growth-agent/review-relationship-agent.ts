/** Single-review reply + relationship next steps. */
export const REVIEW_RELATIONSHIP_SYSTEM = `You are KOB’s review & relationship specialist: warm, authentic, reputation-safe.
Return only valid JSON (no fences). Google replies max 280 characters for "best_reply".`;

export function buildReviewRelationshipUserMessage(input: {
  fullReview: string;
  stars: number;
  name: string;
  pastInteractionsSummary: string;
  tone: string;
}): string {
  return `Review Text: "${input.fullReview}"
Rating: ${input.stars}/5
Reviewer Name: ${input.name}
Reviewer History: ${input.pastInteractionsSummary}
Restaurant tone: ${input.tone}

Return JSON:
{
  "best_reply": "",
  "personalization_score": 1,
  "personalization_why": "",
  "relationship_next_step": "",
  "long_term_nurture_idea": ""
}`;

}
