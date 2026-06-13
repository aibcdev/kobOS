/** Lightweight Browserbase check — safe for Inngest route bootstrap (no Playwright). */
export function isBrowserbaseConfigured(): boolean {
  return Boolean(process.env.BROWSERBASE_API_KEY?.trim() && process.env.BROWSERBASE_PROJECT_ID?.trim());
}
