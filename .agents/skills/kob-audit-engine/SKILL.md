---
name: kob-audit-engine
description: >
  ICP scoring engine for KOB outbound. Use when qualifying restaurants for cold email,
  calculating Ideal Customer Profile fit score, filtering leads for email outreach, or
  enriching restaurant data before pitching. Triggers on ICP score, lead scoring, outbound
  restaurants, fit score, prospect qualification, or cold email list building.
---

# KOB ICP Scoring Engine

Deterministic Ideal Customer Profile (ICP) scoring engine used to find the right restaurants to pitch via cold email outbound.

The competitive advantage is not the scraper. It is this scoring logic. Every prospect must be run through the **exact same rules** so the outbound list stays high-quality and improvements compound.

**Canonical implementation in this repo:** [`lib/outbound/score-icp.ts`](../../../lib/outbound/score-icp.ts) (TypeScript). Keep this skill and that module in sync — any point-value change must be versioned.

## Core Purpose

Input: Restaurant (URL, Google Place ID, or name + location)  
Output: ICP Fit Score + pass/fail decision + personalization hooks for cold email

Only restaurants scoring **70+** should be added to the outbound email list.

## Scoring Formula (ICP Fit Score)

Use this exact point system. Sum all applicable points.

| Factor | Points | Why it matters for KOB |
|--------|--------|------------------------|
| 1–5 locations | +30 | Right size — can buy, decision maker is reachable |
| Independent restaurant | +20 | Not locked into corporate tech stack |
| Rating under 4.5 | +20 | Clear pain — they need reputation help |
| Last Instagram post > 14 days ago | +20 | Marketing maturity gap KOB can fill |
| Website older than ~5 years or dated UX | +15 | Visible website problem |
| No Google Posts in last 30 days | +10 | Inactive Google presence |
| No (or very low) owner review replies | +10 | Easy win with Daily Co-Pilot |
| Chain restaurant | –40 | Harder sale, longer cycle, lower fit |
| Hotel restaurant | –50 | Different buyer, usually not a fit |

### Soft positive add-ons (optional, max +20–30)

- 300–3,000 Google reviews → +10 (enough volume to care, not too big)
- Active on Deliveroo / Uber Eats with real volume → +10 (operationally competent + digital-aware)
- Located in a competitive dining city → +10 (higher urgency)

### Hard disqualifiers (auto-reject regardless of score)

- More than 5–6 locations (or known large chain)
- Pure ghost kitchen / delivery-only (no storefront)
- Google rating below 3.2 (too broken)
- No website **and** no Google Business Profile
- Already a major platform customer with heavy investment (Owner.com, Toast suite, etc. if clearly visible)

## Decision Logic

```
if hard_disqualifier:
  → Discard
elif fit_score >= 70:
  → Qualified for outbound
elif fit_score >= 50:
  → Park / nurture later
else:
  → Discard
```

## Data Required for Scoring

Minimum viable data (gather these first):

1. Number of locations
2. Independent vs chain vs hotel
3. Google rating + review count
4. Last Instagram post date
5. Website age / visual modernity signals
6. Recent Google Posts (yes/no)
7. Owner review response rate (or presence of replies)

Nice-to-have (for better personalization):

- Top competitor ratings nearby
- Presence of online ordering
- Photo count on Google
- Primary category

## Output Format

For every restaurant return:

```json
{
  "place_id": "...",
  "name": "...",
  "fit_score": 85,
  "status": "qualified" | "park" | "discard",
  "matched_factors": ["1-5 locations", "independent", "rating under 4.5", "inactive Instagram"],
  "disqualifiers": [],
  "personalization_hooks": [
    "Google rating 4.2 while two nearby competitors sit at 4.6–4.7",
    "Last Instagram post 37 days ago",
    "Website still uses 2018-era design patterns"
  ],
  "recommended_email_angle": "rating_gap" | "inactive_social" | "dated_website" | "local_pack" | "review_response"
}
```

## How to Use in Outbound Workflow

1. Scrape / enrich a batch of restaurants (Google Maps, etc.)
2. Run every restaurant through this ICP Scoring Engine (`scoreIcp` / CLI)
3. Keep only `status: "qualified"` (score ≥ 70)
4. Use the `personalization_hooks` + `recommended_email_angle` to write the cold email
5. Push qualified leads into the email sequence

## Anti-patterns

- Do not email anyone under 70
- Do not treat high Deliveroo/Uber Eats ranking as a primary positive signal by itself
- Do not use generic website graders or global SEO tools as the scoring source
- Do not skip the independent vs chain check
- Do not invent personalization hooks — only use data you actually gathered

## Version

Any change to point values or disqualifiers must be versioned so historical lists remain reproducible.

Current version: **`icp-fit-v1`** (see `ICP_SCORE_VERSION` in `lib/outbound/score-icp.ts`).

## CLI

```bash
npx tsx scripts/score-icp.ts restaurants.json --pretty
npx tsx scripts/score-icp.ts restaurants.json --qualified-only
cat scraped.json | npx tsx scripts/score-icp.ts - --qualified-only
```

For investment-grade opportunity metrics (lost revenue, likelihood to buy), use the Opportunity Score Engine — see [references/opportunity-score.md](references/opportunity-score.md) and `npx tsx scripts/score-opportunity.ts`.

See [references/fit-score-details.md](references/fit-score-details.md).
