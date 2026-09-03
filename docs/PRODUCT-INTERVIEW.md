# KOB product interview (locked brief)

**Method:** [interview-me](https://gist.github.com/f3kin/e4c9b01310ee25c6a0d72a450bed1d9c)  
**Skill:** [`.agents/skills/interview-me/SKILL.md`](../.agents/skills/interview-me/SKILL.md)  
**Date:** 2026-09-03  
**Confidence at handoff:** ~90% (seeded from live product + Owner wedge + food discovery ship). Remaining gaps are near-term priority and sales motion — see Grill below.

---

## What I'm building

**Project:** KOB (trykob.com) — restaurant visibility operating system for independents

**Summary:** Free food-context audit (identity → discovery survey → scan → email unlock) that surfaces Google/listing/review/website leaks, then a paid approve-only daily list ($49 / $99) without replacing POS, kitchen tablet, or branded guest app. Compete with Owner.com on clarity, price, UK independents, and honesty — not on ordering suite depth.

**Scope (near-term product):**
- Audit funnel with required food discovery (budget, leaks, systems, decision, timeline)
- Report personalization from discovery answers (“What you told us” + opportunity reordering)
- Trial → Today / Chief of Staff approve list (hours, reviews, photos, GBP)
- Marketing honesty: feature pages do not oversell ordering/app
- Owner-compare SEO resources + IndexNow
- Outbound + ads feeding `/audit` and `/go/audit`
- Git-only Netlify production (`kobkob`)

**Out of scope (explicit):**
- Cloning Owner kitchen tablet / first-party ordering / branded guest app as the hero
- Fake named dollar case studies or invented ROI tables
- `netlify deploy --prod` to trykob.com
- City doorway SEO farms
- Buying G2/Capterra reviews

**Tech:**
- Next.js (App Router) on Netlify (`publish=.next`, `@netlify/plugin-nextjs`)
- Supabase auth + Postgres (Prisma `VisibilityAudit` + `resultPayload.discovery`)
- Inngest audit pipeline; Gemini enrichment where configured
- Resend/outbound sequences; Google Ads → `/go/audit`

**Key behaviours:**
1. Find restaurant (Places or URL)
2. Complete 8 required discovery taps
3. Scan with live progress (only after start — no fake homepage progress)
4. Unlock full report with email (phone optional)
5. Trial: approve short daily list; nothing publishes without the owner

**Constraints:**
- UK-first independents; US Owner-conquest via `/demo` (“we don’t replace your POS”)
- Price anchor $49 / $99 vs Owner $249 / $499 (dated 2026-06-20)
- Discovery optional on API/MCP; required on marketing UI
- Preserve `resultPayload.discovery` across pipeline overwrites

**Decisions (critique these):**
1. **Discovery is required on all marketing starts (hero + /audit)** — qualify harder; accept drop-off. Reasoning: user asked for budget/pain before email/phone.
2. **Do not invent Hourglass-style $ annual savings matrices** — bias report order from leaks/goals only. Reasoning: DESIGN + Owner battle plan honesty.
3. **Primary wedge remains listing/reviews/hours, not replatform** — even when discovery selects delivery fees. Reasoning: product cannot fulfill POS swap in trial.
4. **Email unlock stays after scan** — discovery is pre-scan; contact gate unchanged. Reasoning: keep report teaser gravity.
5. **Next 90 days default priority = audit conversion + Today list quality + UK outbound**, not website builder polish. Reasoning: only funnel that steals Owner demo traffic without a sales army.

---

## Grill (confirm or override)

Reply with overrides; otherwise defaults above stand.

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| A | Hero discovery friction | Required / Optional expand / Skip on hero only | **Required** (already shipped) |
| B | Discovery → CRM | Payload only / Also Slack email to hello@ / Folk/Apollo sync | **Payload + include in lead unlock email body** next |
| C | 90-day product #1 | Today list / Website credits / Multi-location / Owner conquest sales | **Today list excellence** |
| D | Geography push | UK only / UK+US ads / LatAm/India with UK | **UK + selective Owner-conquest US ads** |

---

## Next step (pick one)

1. **Start building** — implement grill outcomes (e.g. discovery in unlock email)
2. **Refresh CLAUDE.md / AGENTS.md** pointers to this brief
3. **Enter plan mode** — design Today-list 90-day plan
4. **Spec only** — stop here; this file is the source of truth

---

## Related

- [DESIGN.md](./DESIGN.md) — note: marketing “500+” line is stale vs live site; prefer this brief + live trykob.com
- [OWNER-COMPETITOR-INTEL.md](./OWNER-COMPETITOR-INTEL.md)
- Food discovery: `lib/marketing/audit-discovery.ts`
