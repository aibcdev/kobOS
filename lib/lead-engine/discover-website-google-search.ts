import { z } from "zod";

const BLOCKED_HOSTS =
  /just-eat|justeat|deliveroo|ubereats|facebook|instagram|twitter|tripadvisor|google\.|yelp\.|tiktok\./i;

const websiteSearchSchema = z.object({
  websiteUrl: z.string().url().nullable(),
});

let lastGoogleSearchMs = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimitGoogleSearch() {
  const gap = Math.max(1000, Number(process.env.LEAD_ENGINE_GOOGLE_SEARCH_GAP_MS?.trim() || "1000") || 1000);
  const wait = lastGoogleSearchMs + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastGoogleSearchMs = Date.now();
}

function isLeadGoogleSearchEnabled(): boolean {
  if (process.env.LEAD_ENGINE_GOOGLE_SEARCH?.trim() !== "1") return false;
  return Boolean(process.env.BROWSERBASE_API_KEY?.trim());
}

function pickOrganicUrl(html: string): string | null {
  const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]!);
  for (const href of hrefs) {
    try {
      const u = new URL(href);
      if (BLOCKED_HOSTS.test(u.hostname)) continue;
      if (u.hostname.includes("google.")) continue;
      if (/\.(png|jpg|gif|svg|pdf)$/i.test(href)) continue;
      return u.origin + u.pathname.replace(/\/$/, "") || u.origin;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Fallback: Google search "{name}, {city}, website" via Browserbase when Places has no URL.
 */
export async function discoverWebsiteViaGoogleSearch(
  name: string,
  city: string,
): Promise<string | null> {
  if (!isLeadGoogleSearchEnabled()) return null;

  await rateLimitGoogleSearch();

  const apiKey = process.env.BROWSERBASE_API_KEY!.trim();
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim();
  const model = process.env.AUDIT_STAGEHAND_MODEL?.trim() || "openai/gpt-4o-mini";
  const query = `${name}, ${city}, website`;

  const { Stagehand } = await import("@browserbasehq/stagehand");
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey,
    ...(projectId ? { projectId } : {}),
    model,
    verbose: 0,
  });

  await stagehand.init();
  try {
    const page = stagehand.context.pages()[0];
    if (!page) return null;

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeoutMs: 30_000 });
    await page.waitForLoadState("networkidle", 5000).catch(() => {});

    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const fromHtml = pickOrganicUrl(html);
    if (fromHtml) return fromHtml;

    const raw = await stagehand.extract(
      `Find the official restaurant website for "${name}" in ${city}, UK. ` +
        `Ignore Just Eat, Deliveroo, Uber Eats, Facebook, TripAdvisor. Return null if unsure.`,
      websiteSearchSchema,
    );
    const parsed = websiteSearchSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.websiteUrl) return null;
    const host = new URL(parsed.data.websiteUrl).hostname;
    if (BLOCKED_HOSTS.test(host)) return null;
    return parsed.data.websiteUrl;
  } catch (e) {
    console.warn("[lead-engine] Google search fallback failed", name, e);
    return null;
  } finally {
    await stagehand.close().catch(() => {});
  }
}
