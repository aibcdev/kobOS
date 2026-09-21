# Talk /app agent — diagnosis (2026-09)

## Why KOB returned generic answers

1. Unmatched Talk text → `actOnTalk` `kind: "chat"` canned “I'll take that…”
2. Optional `talkToKob` LLM (xAI) with **no tools** — prose only
3. Approvals only flipped Zustand; no live Google/supplier write + verify
4. Demo engines always returned sample invoice/weather copy

## Architecture now

```
Talk send()
  → house-rule answers (local)
  → runKobTurn()  [intent → tools → KobTurn]
       grounded operational → UI (NEEDS_CONNECTION / ACTION_PROPOSAL / FINDING / RULE)
  → legacy actOnTalk only if turn unsupported
  → chat LLM path REMOVED for operational turns
```

## What works

| Workflow | Behaviour |
| --- | --- |
| What needs me | Findings from store |
| Supplier prices | DEMO cards if accounting on; else Connect invoices |
| Closed Monday | ACTION_PROPOSAL on Google/website; bookings honesty |
| Reviews | Load demo reviews or Connect Google |
| Prep | NEEDS_CONNECTION POS |
| Waste | Explicit no measured waste |
| Never discount / coffee | RULE candidate |

## Still blocked (honest)

- Live GBP write + verify
- Invoice email ingest
- POS / reservations / Waste Eye / Phone

## Metric

Operational turns must set `grounded: true` and `meta.genericFallbackBlocked` when refusing prose.
