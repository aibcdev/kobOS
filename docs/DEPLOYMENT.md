# KOB production deployment

Repo root (deploy from here): `/Users/akeemojuko/KOB`

## 1. Supabase Auth URLs

Hosted project: **Authentication → URL configuration**

Run locally to print the exact strings to paste:

```bash
npm run setup:auth-urls
```

Set `NETLIFY_PRODUCTION_URL=https://your-site.netlify.app` in `.env.local` first if you want the script to include your live URL.

Minimum redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://<your-netlify-site>.netlify.app/auth/callback`

## 2. Netlify (Git — not drag-and-drop)

1. **Add new site → Import from Git** pointing at this repo.
2. **Base directory:** empty if repo root is KOB.
3. **Publish directory:** leave **blank** in UI (`netlify.toml` sets `publish = ".next"`).
4. **Build command:** `npm run build` (from `netlify.toml`).

### Environment variables (Netlify UI)

Copy from `.env.local` (production values):

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes (`https://your-site.netlify.app`) |
| `GEMINI_API_KEY` | Yes for audit benchmarks |
| `OPENAI_API_KEY` | Optional (narrative) |
| `INNGEST_SIGNING_KEY` | Yes for background jobs (from Inngest) |
| `INNGEST_EVENT_KEY` | Yes for sending events (from Inngest) |

After first deploy:

```bash
npm run db:migrate
```

### CLI (optional)

```bash
npm run netlify:login
npx netlify link
npm run netlify:deploy
```

## 3. Inngest — local

**Terminal 1:**

```bash
npm run dev
```

**Terminal 2:**

```bash
npm run inngest:dev
```

Dev UI: http://localhost:8288

## 4. Inngest — production

1. Create app at https://app.inngest.com
2. Sync URL: `https://<your-site>.netlify.app/api/inngest`
3. Add `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` to Netlify env
4. Redeploy

Without Inngest, audits save but benchmark scores stay **pending**.

## 5. Smoke test

```bash
npm run smoke:check
npm run smoke:check -- --url https://your-site.netlify.app
```

Checklist:

1. `/audit` → submit → row in `VisibilityAudit`
2. Results page: benchmark moves from pending → ready (Inngest)
3. `/login` magic link on **Netlify URL** (not only localhost)

## 6. Stripe

Defer until core flow works. See `.env.example` for `STRIPE_*` and webhook `https://<site>/api/stripe/webhook`.

## Owner.com competitive intel (built into marketing)

- **Live copy** — `lib/marketing/copy.ts` + `lib/marketing/owner-pillars.ts` (hero, product pages, footer).
- **Refresh crawl** (free, no Browserbase): `npm run crawl:owner:free` → `downloads/owner-crawl/<timestamp>/`
- **Check alignment**: `npm run marketing:check-owner`
- **Design notes** (manual): `downloads/owner.com-DESIGN.md`
- **Product pages** — `/features/website`, `/features/online-ordering`, `/features/delivery` mirror Owner pillars.
- **Audit funnel** — `/audit` → `/audit/[id]/scanning` → `/audit/[id]` → phone + email modal unlocks full report → optional `/audit/[id]/upgrade` trial.

## Audit pipeline (local)

- Run `npm run dev:public:reset` and `npm run inngest:dev` together so scans finish (about a minute).
- On the results page, **mobile number is required** to unlock scores and the full report (Owner-style hardwall).
- Browserbase keys enable JS rendering; optional `PAGESPEED_API_KEY` for factual mobile scores.
- Manual API discovery: `vendor/browserbase-skills/README.md` (browser-trace + browser-to-api).

## Share locally with ngrok

Use a public URL while developing (stakeholder review, mobile test, OAuth callbacks).

**Terminal 1** — fixed port 3000 (matches Inngest dev URL):

```bash
npm run dev:public
```

**Terminal 2** — background jobs:

```bash
npm run inngest:dev
```

**Terminal 3** — tunnel:

```bash
npm run ngrok
```

Copy the `https://….ngrok-free.app` URL. If login or Google Places fail, temporarily set:

- `NEXT_PUBLIC_APP_URL` to the ngrok URL
- Supabase **Redirect URLs** to `https://<ngrok-host>/auth/callback`

No deploy required — tunnel only forwards to your machine.
