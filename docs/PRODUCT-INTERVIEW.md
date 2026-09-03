# KOB product interview (locked brief)

**Method:** [interview-me](https://gist.github.com/f3kin/e4c9b01310ee25c6a0d72a450bed1d9c)  
**Skill:** [`.agents/skills/interview-me/SKILL.md`](../.agents/skills/interview-me/SKILL.md)  
**Date:** 2026-09-03  
**Status:** Grill defaults **locked** 2026-09-03 (user: go ahead).

---

## What I'm building

**Project:** KOB (trykob.com) — restaurant visibility operating system for independents

**Summary:** Free food-context audit (identity → discovery survey → scan → email unlock) that surfaces Google/listing/review/website leaks, then a paid approve-only daily list ($49 / $99) without replacing POS, kitchen tablet, or branded guest app. Compete with Owner.com on clarity, price, UK independents, and honesty — not on ordering suite depth.

**Scope (near-term product):**
- Audit funnel with required food discovery (budget, leaks, systems, decision, timeline)
- Report personalization from discovery answers (“What you told us” + opportunity reordering)
- Ops notify + outbound insight include discovery on unlock
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
4. Unlock full report with email (phone optional) → ops email with discovery
5. Trial: approve short daily list; nothing publishes without the owner

**Constraints:**
- UK-first independents; US Owner-conquest via `/demo` (“we don’t replace your POS”)
- Price anchor $49 / $99 vs Owner $249 / $499 (dated 2026-06-20)
- Discovery optional on API/MCP; required on marketing UI
- Preserve `resultPayload.discovery` across pipeline overwrites

**Decisions (locked):**
1. **Discovery required on all marketing starts (hero + /audit)**
2. **No Hourglass-style invented ROI matrices** — bias report order from leaks/goals only
3. **Wedge = listing/reviews/hours, not POS replatform**
4. **Email unlock stays after scan**; discovery is pre-scan
5. **90 days = audit conversion + Today list quality + UK outbound**
6. **Discovery → CRM:** payload + ops notify email on unlock + outbound `insightSummary`
7. **Geography:** UK + selective Owner-conquest US ads

---

## Related

- [DESIGN.md](./DESIGN.md) — note: marketing “500+” line is stale vs live site; prefer this brief + live trykob.com
- [OWNER-COMPETITOR-INTEL.md](./OWNER-COMPETITOR-INTEL.md)
- Food discovery: `lib/marketing/audit-discovery.ts`
- Ops notify: `lib/marketing/notify-audit-lead.ts`
