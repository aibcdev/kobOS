# Launch checklist — trykob.com

Use this list in order. Tick each box before going live.

---

## Your side (GoDaddy + Netlify)

### Domain & hosting

- [ ] **GoDaddy DNS** → point `trykob.com` (and `www`) to Netlify (Netlify → Domain settings shows A/CNAME records)
- [ ] **Netlify** → Import this repo from Git → deploy succeeds
- [ ] **HTTPS** works at `https://trykob.com`

### Email

- [ ] **Resend** → Domains → `trykob.com` = **Verified** (TXT + DKIM in GoDaddy DNS)
- [ ] **GoDaddy Microsoft 365** → mailbox `hello@trykob.com` (for reading replies)
- [ ] Send test: Gmail → `hello@trykob.com` → appears in Outlook
- [ ] No **MX record from Resend** (only Microsoft MX for inbox)

### Supabase Auth (you said done — recheck after custom domain)

- [ ] **Site URL:** `https://trykob.com`
- [ ] **Redirect URLs:** `https://trykob.com/**`, `http://localhost:3000/**`
- [ ] Magic link template uses `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (see `npm run setup:auth-urls`)

---

## Netlify environment variables

Copy from `.env.local` into **Netlify → Site → Environment variables**.

Run locally to print the list:

```bash
npm run launch:check
```

**Must set for production:**

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase session pooler URI |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (login email backup) |
| `NEXT_PUBLIC_APP_URL` | `https://trykob.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://trykob.com` |
| `NETLIFY_PRODUCTION_URL` | `https://trykob.com` |
| `GOOGLE_PLACES_API_KEY` | Google Cloud |
| `PLACES_AUTOCOMPLETE_REGIONS` | `GB` |
| `GEMINI_API_KEY` | Google AI Studio |
| `INNGEST_SIGNING_KEY` | Inngest dashboard |
| `INNGEST_EVENT_KEY` | Inngest dashboard |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM_EMAIL` | `KOB <hello@trykob.com>` |
| `RESEND_AUTH_FROM_EMAIL` | `KOB <hello@trykob.com>` |
| `OUTBOUND_RESEND_NOTIFY_EMAIL` | Your personal Gmail |
| `HUNTER_API_KEY` | Hunter.io |
| `OUTBOUND_MODE` | `uk_cold` |
| `OUTBOUND_SALES_MODE` | `1` |
| `OUTBOUND_WORKSPACE_RESTAURANT_ID` | From `npm run sales:bootstrap` |
| `CRON_SECRET` | `openssl rand -hex 32` (optional if using Inngest cloud crons only) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → `https://trykob.com/api/stripe/webhook` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_PRICE_STARTER` | Stripe product price ID (or `STRIPE_GROWTH_PRICE_ID`) |
| `STRIPE_TRIAL_DAYS` | `7` |

**Do not** paste secrets into git. Set only in Netlify UI.

---

## After first Netlify deploy

```bash
# Apply DB migrations (including RLS) to production
npm run db:migrate
```

### Inngest (background audits + outbound)

1. [app.inngest.com](https://app.inngest.com) → Create app
2. **Sync URL:** `https://trykob.com/api/inngest`
3. Add `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` to Netlify → **Redeploy**

Without Inngest, audit scores stay **pending** forever.

### Supabase Security Advisor

After `db:migrate`:

1. Supabase → **Advisors → Security** → **Rerun linter**
2. RLS errors should drop to **0** (migration `20260529200000_enable_rls_public`)

---

## Smoke tests

```bash
npm run launch:check -- --production
npm run smoke:check -- --url https://trykob.com
AUDIT_GOLDEN_BASE_URL=https://trykob.com npm run audit:golden-path
```

**Manual (5 min):**

1. `https://trykob.com/audit` → pick a UK restaurant from Google
2. Scanning page shows real site + rotating design tips
3. Unlock report with test email/phone
4. Start trial → sign in with same email
5. **Dashboard home (Chief of Staff):** morning brief, task list, holiday card
6. At least one task shows **From your audit**; approve one task
7. `https://trykob.com/login` → sign-in email from `hello@trykob.com`
8. Outbound tab loads (after `sales:link-user` on prod DB if needed)

---

## Google Cloud (restrict keys before launch)

- **Places API key** → restrict to Places API + your server IPs / Netlify (if possible)
- **Maps browser key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) → restrict HTTP referrer to `https://trykob.com/*`

---

## Optional (week 1)

- Stripe billing (`STRIPE_*` in `.env.example`)
- Netlify scheduled hit to `/api/cron/outbound` (Inngest crons may be enough)
- Browserbase for JS-heavy audit sites

---

## Quick commands

| Task | Command |
|------|---------|
| Print Supabase URLs | `npm run setup:auth-urls` |
| Launch env checklist | `npm run launch:check` |
| Production smoke | `npm run smoke:check -- --url https://trykob.com` |
| DB migrate prod | `npm run db:migrate` |
| Link sales user | `SALES_OWNER_EMAIL=you@email.com npm run sales:link-user` |
