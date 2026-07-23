# ICP Fit Score — Detailed Rules

This is the single source of truth for qualifying restaurants for KOB cold email outbound.

**Code:** `lib/outbound/score-icp.ts` · **Version:** `icp-fit-v1`

## Mandatory Point Table

| Factor | Points | Guidance |
|--------|--------|----------|
| 1–5 locations | +30 | Count physical locations only. Ideal is 1–3. |
| Independent restaurant | +20 | Not part of a national or large regional chain. |
| Rating under 4.5 | +20 | Google rating. 4.5+ is already relatively strong. |
| Last Instagram post > 14 days | +20 | Organic feed post. Stories do not count as activity. |
| Website older than ~5 years or dated UX | +15 | Copyright year, design patterns, mobile experience, stock photography. |
| No Google Posts in last 30 days | +10 | Check Google Business Profile posts. |
| No / very low owner review replies | +10 | Response rate under ~30% or zero recent replies. |
| Chain restaurant | –40 | Known multi-location brand. |
| Hotel restaurant | –50 | Hotel / resort F&B outlet. |

## Soft Add-ons (use sparingly)

| Signal | Points |
|--------|--------|
| 300–3,000 Google reviews | +10 |
| Meaningful presence on Deliveroo or Uber Eats | +10 |
| High-density competitive dining city | +10 |

## Hard Disqualifiers

Reject immediately (do not score further):

- > 5–6 locations or clear large chain
- Ghost kitchen / delivery-only with no public storefront
- Google rating < 3.2
- No website and no Google Business Profile
- Already deeply invested in a competing full-suite platform (if obvious)

## Final Decision

```
score = sum of all applicable points
if hard_disqualifier:
  status = "discard"
elif score >= 70:
  status = "qualified"          # add to outbound list
elif score >= 50:
  status = "park"               # possible later
else:
  status = "discard"
```

## Personalization Hooks

When `status = "qualified"`, always extract 2–4 concrete hooks from the data for the cold email. Examples:

- Exact rating gap vs nearest competitors
- Days since last Instagram post
- Specific website issues (old copyright, poor mobile, missing order button)
- Missing Google Posts or low photo count
- Low or zero review response rate
