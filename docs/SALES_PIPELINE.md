# KOB sales pipeline

Two tracks in `/dashboard/outbound`:

1. **UK cold** — proactive outreach to qualified UK independents (main growth motion).
2. **Audit follow-up** — people who unlocked a free visibility scan.

---

## UK cold flow (set `OUTBOUND_MODE=uk_cold`)

```text
Daily cron / "Run UK cold + send"
  → Rotate UK city (London, Manchester, …)
  → Google Places: restaurants, 20–500 reviews, not a chain, has website
  → Light homepage scan (must score below 65 = weak online)
  → Hunter.io finds email on domain (fallback: scrape contact page)
  → AI writes personalized cold email
  → Queue tab "UK cold" — you click "Approve UK batch"
  → Inngest sends via Resend (2.5s between emails)
```

### One-time workspace setup

```bash
npm run db:migrate
npm run sales:bootstrap   # creates "KOB" workspace + writes OUTBOUND_WORKSPACE_RESTAURANT_ID to .env.local
# After first login: SALES_OWNER_EMAIL=you@email.com in .env.local, then:
npm run sales:link-user   # links your login to the KOB sales workspace (do not create a second restaurant in the UI)
```

## Login not working?

1. **Next.js must be running** on port 3000 — `npm run inngest:dev` alone is not enough.
   ```bash
   npm run dev:audit
   ```
   Or: `npm run dev:public` (if port busy: `npm run dev:public:reset`).

2. **Supabase dashboard** → Authentication → URL configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**` and `http://127.0.0.1:3000/**`
   - Production: `https://<your-domain>/**` (see `npm run setup:auth-urls`)

3. **Authentication → Providers** → Email: **enabled**.

4. Enter email on `/login` → use the **sign-in code** from email, or open the link (lands on `/auth/confirm`).
   - With `SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY`, the app sends via Resend when Supabase SMTP fails.

5. After login:
   ```bash
   # .env.local: SALES_OWNER_EMAIL=your-login-email
   npm run sales:link-user
   ```

**Local dev (one command — site + Inngest):**

```bash
npm run dev:audit
```

Or two terminals: `npm run dev:public` and `npm run inngest:dev` (stop extra Inngest processes if port conflicts).

### Required env

```bash
OUTBOUND_MODE=uk_cold
OUTBOUND_SALES_MODE=1
OUTBOUND_WORKSPACE_RESTAURANT_ID=<auto-filled by sales:bootstrap>
OUTBOUND_UK_CITIES=London,Manchester,Birmingham,Leeds,Bristol,Glasgow,Edinburgh
OUTBOUND_REVIEW_MIN=20
OUTBOUND_REVIEW_MAX=500
OUTBOUND_MAX_QUALIFY_SCORE=65
OUTBOUND_UK_DAILY_CAP=20

GOOGLE_PLACES_API_KEY=
PLACES_AUTOCOMPLETE_REGIONS=GB
GEMINI_API_KEY=              # drafts UK cold copy (OPENAI_API_KEY optional fallback)
HUNTER_API_KEY=              # required for cold email addresses
RESEND_API_KEY=
RESEND_FROM_EMAIL=KOB <you@verified-domain.com>
OUTBOUND_RESEND_NOTIFY_EMAIL=you@company.com

INNGEST_DEV=1
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
CRON_SECRET=
```

### Your daily routine (~10 min)

1. Check email summary: “N UK cold leads ready”.
2. Open **UK cold** tab — skim scores and copy.
3. Click **Approve UK batch**.
4. Sends run automatically (or click **Send approved only**).

### ICP rules (code)

- Independent only — chain names/hosts blocked ([`lib/outbound/chain-denylist.ts`](../lib/outbound/chain-denylist.ts))
- Reviews between `OUTBOUND_REVIEW_MIN` and `OUTBOUND_REVIEW_MAX`
- Website required
- Visibility score must be **below** `OUTBOUND_MAX_QUALIFY_SCORE`

---

## Audit follow-up flow

```text
Import audit emails (manual or daily cron)
  → Uses email from unlock form
  → Audit tab — approve batch or one-by-one
  → Same Resend send job
```

Set `OUTBOUND_MODE` empty or `legacy` to use old city-only AI scan instead of UK cold pipeline.

---

## Cron (production)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-SITE/api/cron/outbound
```

Enqueues (when `OUTBOUND_MODE=uk_cold`):

- `outbound/uk-cold.requested`
- `outbound/audit-import.requested`
- `outbound/send.requested`

Schedule daily (e.g. Netlify scheduled function) at a time you will review within 1–2 hours.

---

## Local dev

```bash
# Terminal 1
npm run dev:public

# Terminal 2
npm run inngest:dev
```

Then dashboard → **Run UK cold + send**, or trigger events in Inngest UI.

---

## Compliance (UK)

- B2B cold email: legitimate interest, clear sender, opt-out line in template (included).
- You approve every batch before send — not fully unattended.

---

## Ship checklist

| Done when |
|-----------|
| Hunter account + `HUNTER_API_KEY` |
| Resend domain verified |
| `OUTBOUND_WORKSPACE_RESTAURANT_ID` set |
| Inngest synced on production |
| Daily cron hitting `/api/cron/outbound` |
| First batch approved and test email received |

---

## Code map

| Piece | Path |
|-------|------|
| UK pipeline | `lib/outbound/run-uk-cold-pipeline.ts` |
| ICP config | `lib/outbound/icp-config.ts` |
| Qualify scan | `lib/outbound/qualify-prospect.ts` |
| Hunter | `lib/outbound/enrich-email.ts` |
| Inngest | `inngest/functions.ts` → `outboundUkColdDaily` |
| Batch approve | `app/api/outbound/approve-batch/route.ts` |
| UI | `components/dashboard/outbound/OutboundWorkspace.tsx` |
