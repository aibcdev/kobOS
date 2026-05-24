# Browserbase skills (reference)

KOB captures same-origin network samples in-process during audit Browserbase renders
(`lib/audit/network-capture.ts`, `lib/browserbase/fetch-page.ts`) and summarizes them for the
factual rubric (`lib/audit/api-surface-insights.ts`) — menu/order/graphql paths, same as a lightweight
in-app `browser-to-api` pass.

For full OpenAPI discovery from a manual capture session, use upstream skills:

```bash
npx skills add https://github.com/browserbase/skills --skill browser-trace
npx skills add https://github.com/browserbase/skills --skill browser-to-api
```

Workflow: `browser-trace` → `.o11y/<run>/cdp/network/` → `browser-to-api` `discover.mjs` → `openapi.yaml`.

Docs: https://www.skills.sh/browserbase/skills/browser-to-api
