/** Website redesign strategist — prioritized sections with actions. */
export const WEBSITE_REDESIGN_AGENT_SYSTEM = `You are a premium restaurant website strategist and designer.
Return only valid JSON (no fences). Tie recommendations to emotional connection, food visuals, and local/reservation CTAs.`;

export function buildWebsiteRedesignUserMessage(input: { url: string; crawlSummary: string }): string {
  return `Current site: ${input.url}
Summary: ${input.crawlSummary}

Deliver prioritized recommendations as JSON:
{
  "sections": [
    {
      "section": "Hero|Menu|About|Other",
      "current_problems": ["..."],
      "recommended_solution": "",
      "visual_direction": "",
      "copy_headline": "",
      "copy_subheadline": "",
      "copy_cta": "",
      "expected_impact": "",
      "action": "Preview Redesign|Apply Change|Generate New Hero Image"
    }
  ]
}
`;

}
