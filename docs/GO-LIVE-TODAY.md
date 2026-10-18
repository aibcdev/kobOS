# Go live today — production only

Ignore Stripe **test mode**. Everything below is **live**.

---

## 0. Gemini (required for dashboard AI)

Add to Netlify:

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Powers: Today brief, Chat, content drafts, audit summaries.

---

## 1. Stripe (15 min)

**Dashboard:** [dashboard.stripe.com](https://dashboard.stripe.com) — confirm **Test mode is OFF** (top-right).

### Create 2 products (Product catalog → Create product)

| Name | Price | Billing |
|------|-------|---------|
| KOB Founding | $99 (GBP option £79 via `currency_options`) | Recurring monthly |

Copy each **Price ID** (`price_...`) — you need both.

### API keys (Developers → API keys)

Copy into Netlify:

- **Secret key** → `STRIPE_SECRET_KEY`
- **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Webhook (Developers → Webhooks → Add endpoint)

- URL: `https://trykob.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Netlify Stripe vars (all secrets)

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...            ← KOB Founding $99 / £79 (STRIPE_PRICE_STARTER resolves to the same price)
STRIPE_GROWTH_PRICE_ID=price_...      ← same as STRIPE_PRICE_STARTER
STRIPE_TRIAL_DAYS=7
```

---

## 2. Inngest (5 min)

[app.inngest.com](https://app.inngest.com) → Production keys:

- `INNGEST_SIGNING_KEY`
- `INNGEST_EVENT_KEY`

Add to Netlify → **Redeploy** → Sync URL: `https://trykob.com/api/inngest`

---

## 3. Database migrations (5 min)

From your machine (with production `DATABASE_URL`):

```
npm run db:migrate
```

Required for Chat, workspace, and task features.

---

## 4. Netlify redeploy

After any env change: **Deploys → Trigger deploy**

---

## 5. One real test (10 min)

1. https://trykob.com/audit → UK restaurant → wait for report
2. Unlock with your email
3. Start trial → Stripe shows **$99/mo (£79 UK)** + 7-day trial, no card
4. Land on dashboard → see task list

If audit stays “pending” → Inngest not synced.

If checkout fails → Stripe price IDs don’t match live keys (re-copy from live Product catalog).

---

## 6. Ads / emails

Only send traffic after step 4 passes once.

Login emails: from `hello@trykob.com` (Resend verified).
