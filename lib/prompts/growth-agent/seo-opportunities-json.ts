/** Instructions for SEO opportunity JSON (Growth Agent specialist). */
export const SEO_OPPORTUNITY_JSON_INSTRUCTIONS = `Analyze keyword gaps and local search opportunities.

Return JSON only:
{
  "opportunities": [
    {
      "keyword": "",
      "estimated_monthly_searches": 0,
      "difficulty": "Low|Medium|High",
      "potential_impact": "High|Medium",
      "current_rank": null,
      "suggested_page_title": "",
      "suggested_url_slug": "",
      "why_it_matters": "",
      "action": "Generate SEO Page|Optimize Existing|Build Landing Page"
    }
  ]
}

Provide up to 8 opportunities. Prioritize high-intent local and "best [cuisine] near me" style terms.`;
