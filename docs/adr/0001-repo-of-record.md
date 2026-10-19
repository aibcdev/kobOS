# ADR 0001: kobOS is the repo of record

- **Status:** Accepted
- **Date:** 2026-10-18
- **Decider:** Akeem

## Context

KOB code has lived in four repositories, and they disagree on price, trial length and product claims:

| Repo | What it is | Live? |
|------|------------|-------|
| `aibcdev/kobOS` | Next.js 16 product + marketing site, Prisma/Supabase, Inngest, Stripe | **Yes.** Serves trykob.com via Netlify Git on `main` |
| `aibcdev/kob` | TanStack prototype ("Talk. It does the work."), £99/£149/£299 with a 14-day trial | No |
| `Cofounder-Customer-Projects/kob-b37977` | Unmodified starter | No |
| `Cofounder-Customer-Projects/kob-b37977-marketing` | Unreleased marketing branch (£497/mo) | No |

Agents and contributors have picked up copy, pricing and features from the wrong repo.

## Decision

`aibcdev/kobOS` is the only product and marketing repository for trykob.com.

- Production deploys only from `main` through Netlify Git. Never `netlify deploy --prod`
  (`.cursor/rules/kob-netlify-git-only.mdc`).
- The other three repos are frozen and archived. Nothing is copied from them without an explicit ticket.
- Price and trial come from code in this repo (`lib/billing/regional-pricing.ts`, `getStripeTrialDays()`), not from
  any other repo or doc.

## Worth salvaging

- **Localized homepages** from `aibcdev/kob` PR #1 ("Localized homepages (es, pt-BR, id, hi, th) with hreflang +
  sitemap"): the i18n dictionary approach (`src/lib/i18n/*`), language switcher and hreflang/sitemap entries. If
  localized marketing pages are ticketed, port the idea into the Next.js App Router here, not the TanStack code.

Nothing else is carried over.

## Consequences

- Manual (Akeem): archive `aibcdev/kob`, `Cofounder-Customer-Projects/kob-b37977` and
  `Cofounder-Customer-Projects/kob-b37977-marketing` in GitHub (Settings → Danger Zone → Archive this repository).
- Docs that quote other prices or trial lengths are corrected in T-06.
