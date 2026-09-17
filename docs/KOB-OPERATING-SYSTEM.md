# KOB operating system

KOB is the AI restaurant manager. It observes, understands, decides, authorises, acts, verifies, and learns.

Doctrine: **OBSERVE → UNDERSTAND → DECIDE → AUTHORISE → ACT → VERIFY → LEARN**

No workflow is complete without **VERIFY**. HTTP 200 is not proof.

Postgres is the source of truth. The LLM reasons over structured data. It is not the datastore.

Guest phone and POS stay **Coming soon**. Do not clone Owner ordering. Never invent named $ case studies. Never fake Google posts. Measured waste ≠ predicted waste.

Read [`PRODUCT-INTERVIEW.md`](./PRODUCT-INTERVIEW.md) for wedge and honesty. This file is the engineering constitution.

## Layers

UI (web, mobile, voice, WhatsApp) → Orchestrator → Restaurant brain → Connector adapters + decision engines → Action + verification log.

## Action statuses

`DETECTED` → `PROPOSED` → `AWAITING_APPROVAL` → `APPROVED` → `EXECUTING` → `EXECUTED` → `VERIFYING` → `VERIFIED`

Also: `FAILED` | `REJECTED` | `ROLLED_BACK`

Never show **Done** for `EXECUTED` unverified. Use: “Sent — waiting for confirmation.”

`VERIFIED` only if `external_state == expected_state` (or a trusted connector proves completion).

## Permission

`NEVER` | `ASK` | `AUTO_WITH_LIMITS` | `AUTOPILOT`

Authorised = Policy AND Role AND Risk.

Risk = 0.30 Financial + 0.25 Customer + 0.15 Reversibility + 0.15 Reputation + 0.15 Operational.

0–20 low; 21–50 moderate; 51–75 high (usually ask); 76–100 always ask.

## Reliability score

For workflow `w`:

`R_w = 0.25D + 0.20E + 0.20V + 0.15C + 0.10F + 0.10U` (each 0–1)

| R_w | Behaviour |
| --- | --- |
| < 0.85 | Insight only |
| 0.85–0.92 | Suggest + approval |
| 0.92–0.97 | Limited autopilot |
| > 0.97 | Eligible for full autopilot **inside policy** |

## Readiness gate (LIVE)

All required: reliable data, E2E workflow, failure states, permissions, execute, verify, audit, voice equivalent, monitoring, acceptance test.

Otherwise: BETA / PREDICTION / INSIGHT / COMING SOON.

## Waste claim gate

Say “measures food waste” only if `measurement_method != ESTIMATE`.

Claim reduction only with comparable measured periods, min sample (14 days, prefer 28), same method.

## Workflow spec (mandatory before code)

INPUTS, SOURCE OF TRUTH, TRIGGERS, DECISION LOGIC, FORMULA, CONFIDENCE RULE, PERMISSION RULE, ACTION, EXTERNAL SIDE EFFECT, VERIFICATION, ROLLBACK, FAILURE STATES, AUDIT DATA, VOICE EQUIVALENT, SUCCESS METRIC.

## Implementation order

A spine + hours verify → B Google/website/reputation/invoices → C cost/forecast (POS adapter optional) → D Waste Eye → E reservations/autopilot.

## North star

Verified useful actions per active location per week. Not logins.
