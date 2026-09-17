---
name: kob-operating-system
description: >
  Mandatory KOB OS engineering skill. Use before any restaurant workflow,
  integration, Talk/voice action, hours, reviews, invoices, suppliers, waste,
  or autonomy. Forces OBSERVE→VERIFY, structured state, and reliability gates—
  not LLM UI. Triggers: KOB action, verify, Google hours, waste, invoice,
  permission, autopilot, restaurant brain.
---

# KOB operating system

Canonical doctrine: [`docs/KOB-OPERATING-SYSTEM.md`](../../../docs/KOB-OPERATING-SYSTEM.md)

Code: [`lib/os/`](../../../lib/os/)

## Before implementing any workflow

Output this spec. Do not skip.

```
INPUTS
SOURCE OF TRUTH
TRIGGERS
DECISION LOGIC
FORMULA
CONFIDENCE RULE
PERMISSION RULE
ACTION
EXTERNAL SIDE EFFECT
VERIFICATION
ROLLBACK
FAILURE STATES
AUDIT DATA
VOICE EQUIVALENT
SUCCESS METRIC
```

## Rules

- Postgres is source of truth.
- `VERIFIED` only after read-back (or trusted proof).
- Never display Done for unverified execute.
- Guest phone/POS = Coming soon. No Owner POS clone.
- Measured waste never mixes ESTIMATE.
- High-risk money never voice-only.

## Reliability

`R_w = 0.25D + 0.20E + 0.20V + 0.15C + 0.10F + 0.10U`

Use `lib/os/reliability.ts`. Autonomy follows `autonomyFromReliability`.
