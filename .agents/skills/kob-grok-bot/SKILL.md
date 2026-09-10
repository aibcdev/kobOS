---
name: kob-grok-bot
description: >
  Stand up Grok Bot teammates for KOB (trykob.com): outbound 100-send, AEO/SEO,
  and inbox. Use when starting Grok Bot, creating KOB AI teammates, or handing
  off daily restaurant growth ops that must stay approve-only.
---

# KOB Grok Bot

Grok Bot is an always-on teammate with its own cloud computer ([x.ai/bot](https://x.ai/bot)). It is **not** a customer chatbot on trykob.com.

## Day 1 (do this once)

1. Open Grok Bot (Cursor Pro / SuperGrok). Sign in as the **KOB** operator, not Harbor.
2. Create **three** bots. Paste the matching brief from `briefs/`.
3. Connect only: Gmail (`hello@trykob.com` or outbound mailbox), Folk, GitHub `aibcdev/kobOS`, browser for trykob.com / Google Ads / Search Console. **Do not** give Ads spend, Resend send, Netlify DNS, or Stripe live keys without a human.
4. Record one routine: watch `npm run outbound:pool`, send approved mail through the connected KOB Gmail account, then import Gmail receipts with `npm run outbound:record-grok`.
5. First live job: morning status — pool counts, last send date, “can we send 100 today?” with a yes/no and blockers.

## Hard rules (every bot)

- **Never send** cold email, LinkedIn, or ads without a human approve list.
- **Never** change Google Ads budgets/CPC, DNS, or production env vars.
- Dedup against already-SENT emails/placeIds.
- ICP: independent restaurants, 1–5 locations, score ≥70. No chains, hotels, ghost kitchens.
- Website must match the venue. Parked domains and generic pizza.uk hosts are rejects.
- Thin SEO farms are banned (no city doorway pages).

## The three bots

| Bot | Brief | Cadence |
|-----|--------|---------|
| KOB Outbound | `briefs/01-outbound.md` | Daily 07:00 UTC / 08:00 BST |
| KOB AEO/SEO | `briefs/02-aeo-seo.md` | 3× week |
| KOB Inbox | `briefs/03-inbox.md` | Continuous |

Put all three in one group thread named **KOB Growth**. Outbound posts the morning queue; AEO posts citation/index work; Inbox only surfaces buyers, press, and churn.

## Repo commands the bots should use

```bash
npm run outbound:pool
npm run outbound:record-grok -- /path/to/receipts.json
npm run outbound:prep-next-100
npm run resources:indexnow
npm run outbound:reddit-intent
npm run seo:mention-gaps
npm run outbound:heard-from-report
```

Workspace: `OUTBOUND_WORKSPACE_RESTAURANT_ID`. Product: https://trykob.com — free audit https://trykob.com/go/audit — AI briefing https://trykob.com/for-ai
