import { defineConfig } from "@playwright/test";

/** With E2E_DATABASE_URL, the dev server runs in UI preview against that DB and executes actions in-process. */
const e2eDb = process.env.E2E_DATABASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3102",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3102",
    url: "http://127.0.0.1:3102",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: e2eDb
      ? { DATABASE_URL: e2eDb, NEXT_PUBLIC_UI_PREVIEW: "1", KOB_INLINE_ACTIONS: "1", KOB_INLINE_STEP_MS: "2500" }
      : {},
  },
});
