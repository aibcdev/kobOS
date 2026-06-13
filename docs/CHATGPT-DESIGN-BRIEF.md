# KOB — Company & design brief (for external design cleanup)

**Site:** https://trykob.com  
**Repo:** Next.js marketing + audit funnel + dashboard (do not redesign the audit flow UX — only polish if needed)

Copy this entire document into ChatGPT when asking for homepage / marketing site design cleanup.

---

## PROMPT TO PASTE INTO CHATGPT

You are redesigning the **marketing website** for **KOB** (trykob.com) — a product for **independent UK restaurants and cafés**.

Your job: make the public site feel **calm, premium, trustworthy, and dead simple** for a busy restaurant owner who is **not technical**, barely uses social media, and does not understand “AI” jargon.

**Do not** make it look like a generic SaaS dashboard, a branding agency, or a dark-mode AI startup. Benchmark visual quality against **Sunday App, Stripe, Linear** — and the **clarity** of Owner.com’s audit funnel (we already have that funnel built; don’t break it).

---

## One-sentence company description

**KOB is your restaurant’s ultimate employee online** — it watches your website, Google listing, and reviews, then every morning gives you a short list of what needs doing (reply to a review, post for a bank holiday, fix your hours). You **approve in one tap**; KOB prepares drafts for you to review. Nothing posts automatically without you.

---

## What KOB is NOT (critical for copy and design)

| Do NOT say or imply | Say instead |
|---------------------|-------------|
| “Chief of Staff” (sounds like HR / managing staff) | “Your daily helper”, “ultimate employee”, “never miss a beat online” |
| “Growth platform”, “revenue stack”, “AI Growth Agent” | “Daily task list”, “what guests notice”, “approve fixes” |
| Jargon: SEO deck, funnels, LLM, agents | Plain English: “Google listing”, “reviews”, “holiday posts”, “menu photos” |
| We are Owner.com | We compete on **price and simplicity** — see comparison below |
| Full website builder + ordering app is live day one | Lead with **free scan + daily tasks**; other modules are roadmap / secondary |

---

## Who we serve

- Independent restaurants, cafés, bars — **UK-first** (GBP/UK holidays in product logic; site can show $ for founding pricing).
- Owner-operator or small team — **no time** for five apps and an agency retainer.
- They care about: not embarrassing themselves online, not missing reviews, bank holidays, wrong hours, stale photos.

---

## Core user journey (already built — design should support this)

```text
1. Land on homepage → enter restaurant URL or name
2. Free scan (~1 min) → animated “scanning” page (Owner-style — keep this feel)
3. Gated report → email + phone to unlock full scores
4. Start 7-day free trial (Stripe) — founding plan from $49/mo
5. Dashboard “Today” → morning brief + task list → tap Approve → drafts ready on Content page
```

**Primary CTA everywhere:** “Run free scan” (not “Book a demo” as hero).

---

## Product pillars (how to talk about features)

Frame everything as **“one less thing you forget”**, not separate revenue products:

1. **Watch** — Free scan shows what guests see before they book (website, Google, reviews, photos).
2. **Daily list** — Every morning: what needs doing, why, how long.
3. **Approve** — One tap; KOB prepares reply/post draft; owner reviews before anything goes live.
4. **Stay consistent** — UK bank holidays, slow weeks, listing accuracy — don’t slip while running service.

**Included in messaging (honest v1):**

- Free hospitality perception scan  
- Daily tasks from scan data (reviews, holidays, hours, posts)  
- Draft generation on approve (not auto-post to Instagram/Google yet)  
- 7-day trial, cancel anytime  

**Roadmap / secondary (don’t lead homepage with these):**

- Full AI website rebuild, native ordering app, loyalty CRM — mention lightly or on subpages only.

---

## Pricing (founding offer — use on site)

**Founding member pricing — first 10 restaurants lock in:**

| Plan | Founding | Later | Owner.com (comparison) |
|------|----------|-------|-------------------------|
| **Flex** | **$49/mo** + 2.5% per direct order | $125/mo | $249/mo + 5% |
| **Flat** | **$99/mo**, no order fees | $250/mo | $499/mo |

- No long-term contracts.  
- Comparison table vs Owner.com is a **key homepage section** — keep it structured and scannable.  
- Footnote: competitor pricing from public list rates; comparison only.

---

## Brand voice & copy rules

- **Short sentences.** No buzzwords.  
- **You / your restaurant** — not “operators” or “merchants”.  
- Stats OK if plain: “Most guests check your website before they visit.”  
- Tagline: **“Your restaurant’s ultimate employee.”**  
- Hero idea: **gap between how good you are in the room vs how you look online** → then **daily helper** fixes the gaps.  
- Never promise “we post for you” — say **“we prepare drafts; you approve”.**

**Sample hero (direction only):**

> **See the gap between how good you are—and how you look online.**  
> KOB watches your website, reviews, and listings. Every morning: what needs doing. One tap to approve. Start with a free scan.

---

## Visual & UX direction

### Feel

- Calm, premium, hospitality-native — **cream / soft green / forest green** palette (existing: `#f9f3ed`, `#094413`, `#088924`, `#fbf8f5`).  
- Generous whitespace; easy scan; **one primary action per section**.  
- Rounded cards (24px-ish), subtle borders, minimal shadow.  
- Typography: confident headlines, readable body — not cramped.

### Homepage section order (recommended)

1. Hero — headline + **single URL/search input** + “Run free scan”  
2. Trust line — “Trusted by 500+ restaurants & cafés” (social proof band)  
3. **KOB vs Owner.com** — comparison table + founding price callout  
4. How it works — **Watch → Approve → Stay consistent** (3 steps, not “traffic / sales / loyalty”)  
5. Benefits — reviews, holidays, hours/listings (tabs or cards)  
6. Beliefs — owners shouldn’t babysit their online presence; plain English; consistency beats perfection  
7. Final CTA — free scan again  

### What NOT to redesign

- **`/audit/*` funnel** — scanning animation, unlock modal, report layout: Owner-style grader. Only light visual consistency (colors/fonts).  
- **`/dashboard/*`** — separate app shell; out of scope unless asked.  
- **Do not remove** privacy link (`/privacy`), login, pricing, Stripe trial path.

### What TO clean up

- Remove leftover **Owner.com clone** vibes on homepage (ordering phone mockups selling “direct orders” / “zero commission” as hero story).  
- Replace with **task-list / morning brief** visual metaphor where possible.  
- Unify nav: lead with **Free scan**; demote legacy “Products” dropdown noise.  
- Pricing page: founding badges, strikethrough “later” prices, comparison block.  
- Ensure mobile: hero form, comparison table, CTAs thumb-friendly.

---

## Pages map

| Route | Purpose |
|-------|---------|
| `/` | Homepage — conversion to free scan |
| `/audit` | Alternate entry — Google Places search |
| `/audit/{id}/scanning` | Scanning experience (keep) |
| `/audit/{id}` | Report + unlock + trial CTA |
| `/pricing` | Founding plans + vs Owner.com |
| `/login` `/signup` | Magic link auth |
| `/dashboard` | Logged-in daily task home |
| `/privacy` | Privacy policy |

---

## Competitor positioning (Owner.com)

- Owner.com = premium all-in-one growth stack ($249–$499/mo), sales-led demo.  
- KOB = **lower price**, **free scan first**, **daily task helper** for owners who want simplicity not a product catalogue.  
- We mimic their **audit funnel UX** (industry standard); we **differentiate on story + price + approve-in-one-tap workflow**.

---

## Deliverables to ask ChatGPT for

1. Revised homepage wireframe / section copy (plain English).  
2. Component-level suggestions: hero, comparison table, how-it-works, pricing cards, nav, footer.  
3. CSS/token tweaks only if given existing colors above — no new brand rename.  
4. Mobile-first layout notes.  
5. List of **copy to delete** (jargon, Chief of Staff, revenue-first Owner clone lines).

---

## Technical note for implementers

- Marketing lives in `components/marketing/saas/*` and `lib/marketing/copy.ts`.  
- Pricing data: `lib/marketing/pricing-plans.ts`.  
- Do not change API routes or audit logic in a “design-only” pass.

---

*Last updated: launch phase — founding pricing live, trykob.com on Netlify.*
