# KOB incident runbook

## First check

Call `GET /api/ops/health` with `Authorization: Bearer $OPS_STATUS_SECRET` (or `$CRON_SECRET`).

## Outbound below 100

1. Read `outbound.queueReady`, delivery counts, suppressions, and cron heartbeats.
2. Refill with qualified independent, single-site restaurants only.
3. Approve only leads with a completed audit, score 70+, a matching website, and a valid email.
4. Never bypass suppression, approval, idempotency, or the daily cap.

## Audit stuck

1. Read `audits.stuck` and the `audit-drain` heartbeat.
2. The drain retries three times automatically.
3. Inspect the recorded `processingError` before manually retrying a dead-letter audit.

## Signup or payment failure

1. Confirm Supabase and Stripe are green in health.
2. Check the Stripe event and subscription row.
3. `past_due`, failed, or cancelled subscriptions must not receive paid access.
4. Replaying a Stripe webhook is safe because event IDs are claimed once.

## Email bounce or complaint

1. Confirm the Resend webhook arrived.
2. The address must appear in `OutboundSuppression`.
3. Never remove a complaint or unsubscribe suppression to hit a volume target.

## Deployment

Production is Git-only: push reviewed code to `aibcdev/kobOS` `main`. Never use a Netlify production deploy command.
