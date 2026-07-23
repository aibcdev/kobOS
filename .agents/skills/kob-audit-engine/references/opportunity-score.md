# Opportunity Score Engine (opportunity-v1)

Investment-grade restaurant intelligence for outbound + audit conversion.

**Code:** [`lib/outbound/score-opportunity.ts`](../../../lib/outbound/score-opportunity.ts)

## Outputs

| Field | Meaning |
|-------|---------|
| `revenue_potential` | 1–5 stars (size + demand signals) |
| `marketing_maturity` | 0–100 (higher = more mature / less pain) |
| `likelihood_to_buy` | 5–95% |
| `est_monthly_lost_customers` | Transparent loss model |
| `est_lost_revenue` | `lost_customers × avg_ticket` (default £32) |

## Status gate (outbound)

```
if hard_disqualifier → discard
elif fit_proxy >= 70 AND likelihood_to_buy >= 60 → qualified
elif fit_proxy >= 50 → park
else → discard
```

## CLI

```bash
npx tsx scripts/score-opportunity.ts restaurants.json --pretty
npx tsx scripts/score-opportunity.ts restaurants.json --qualified-only
```

Keep in sync with the Opportunity Score Engine — bump `OPPORTUNITY_SCORE_VERSION` (`opportunity-v2`).

## Lost revenue (upper bound)

Audit + outbound use an **upper-bound** leak model scaled by location count, with floors:

| Locations | Min est. lost revenue / mo (when gaps visible) |
|-----------|-----------------------------------------------|
| 1–2 | £2,500 |
| 3–5 | £8,000 |
| 6–15 | £24,000 |
| 16+ | £48,000 |

Free audit reports run footprint detection **3 times** and reconcile (see `computeAuditOpportunityReportTriple`).
