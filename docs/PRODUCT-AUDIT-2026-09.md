# KOB product audit — September 2026

## Route inventory (marketing)

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | AI restaurant manager homepage | Primary |
| `/onboard` | Hire wizard → Talk | Primary |
| `/login` `/signup` | Auth → `/app` | Primary |
| `/#pricing` | £99 founding | Canonical |
| `/pricing` | Must match founding offer | Fix |
| `/product` | Soft-land to manager | Fix |
| `/audit` `/go/audit` | Ads scan funnel | Bridge to onboard |
| `/privacy` `/terms` | Manager + phone-not-live | Mostly OK |
| `/data-management` | Ops data | Fix email |
| `/dashboard/*` | Legacy ops UI | Not owner hero |

## Claim matrix

| Claim | Capability | Verifiable? | Site label |
| --- | --- | --- | --- |
| Hours check Google vs site | Public scrape / Talk | Partial | BETA until GBP OAuth verify |
| Review drafts | Talk drafts | Draft only | LIVE drafts; post = CONNECTING |
| Invoice photo | OCR demo | Manual | BETA (email ingest Coming next) |
| Weather prep | API | Yes if city set | BETA |
| Supplier unit cost | Formulas in `lib/os/cost` | Needs invoices | BETA |
| Prep quantities | Forecast formulas | Needs POS | BETA |
| Measured waste | Waste Eye | No | COMING NEXT |
| Guest phone | ElevenLabs | No | COMING NEXT |
| Autopilot 5-star post | GBP write | No | ASK until verified |

## Journey (target)

```
Try KOB free → Places search → public findings → role/matters/autonomy
→ account → Talk “I found X” → approve → verify language
```

## Analytics events

`homepage_view`, `hero_try_clicked`, `hero_talk_clicked`, `restaurant_search_started`, `restaurant_search_result_selected`, `first_finding_viewed`, `signup_started`, `signup_completed`, `first_action_proposed`, `first_action_approved`, `trial_started`

## P0

1. One story / price / meta  
2. Homepage brief order  
3. Kill fake Done  
4. Value-first onboard  
5. Audit→onboard bridge + auth→`/app`

## P1

Cost Watch / Prep BETA / Memory / empty states / mobile / legal sweep
