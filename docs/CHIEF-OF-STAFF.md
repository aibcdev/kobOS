# KOB Chief of Staff

**Tagline:** The AI Chief of Staff for Restaurants.

Every morning the owner sees what needs attention, why it matters, revenue impact, and mostly taps **Approve** — not build from scratch.

---

## Launch (v1)

| Area | Status |
|------|--------|
| 3-column home at `/dashboard` | Shipped |
| Tasks from linked visibility audit | Real data (`build-audit-tasks.ts`) |
| AI daily brief + suggestions | Gemini/OpenAI with rule fallback |
| UK holiday card | Static calendar (`uk-holidays.ts`) |
| Approve / dismiss tasks | API + UI |
| AI personality (Balanced, Warm, Direct, Concise, Sassy) | Stored on `Restaurant.aiPersonality` |
| “Connect to enable” badges | Instagram, email inbox — vision only |

**Audit → dashboard:** Trial signup passes `visibilityAuditId`; audit links to `restaurantId`. First dashboard load runs `ensureTodayBrief`.

---

## Engine roadmap (post-launch)

| Engine | v1 | Phase 2 |
|--------|----|---------|
| Audit → tasks | Real leaks, competitors, perception gaps | Deeper auto-fix |
| Holiday | Static dates + AI draft flags | Scheduled send |
| Reviews | Audit + AI reply drafts | Google sync, bulk approve |
| Social | AI post drafts + Connect badge | Instagram API post |
| SEO | Audit benchmark tasks | Rank tracking API |
| Email inbox | Suggested task + Connect badge | Microsoft Graph / Gmail |
| Menu | Audit copy only | POS / menu upload |
| Competitor | Audit peers | Weekly Places cron |
| KOB Design | Approve → `GeneratedContent` | Image gen pipeline |
| KOB Space | Placeholder | Layout analysis |

---

## Key files

- `lib/chief-of-staff/` — generators, schema, UK holidays
- `components/dashboard/chief-of-staff/` — UI
- `app/api/chief-of-staff/` — today, approve, regenerate
- `lib/dashboard/chief-of-staff-theme.ts` — layout tokens

---

## Launch smoke test

1. Complete audit on trykob.com → unlock → start trial → land on **new home**
2. Morning brief shows real score / leak data from audit
3. At least 3 tasks tagged **From your audit**
4. Holiday card shows next UK event
5. Approve one task → status updates
6. Change personality → next brief tone shifts
