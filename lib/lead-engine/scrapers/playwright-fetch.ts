import { fetchRenderedPage, isBrowserbaseConfigured } from "@/lib/browserbase/fetch-page";
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function chromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (fromEnv) return fromEnv;
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(macChrome)) return macChrome;
  return undefined;
}
export async function fetchRenderedHtml(url: string, waitMs = 4000): Promise<string | null> {
  if (process.env.LEAD_ENGINE_DISABLE_BROWSER?.trim() === "1") return null;

  if (isBrowserbaseConfigured()) {
    try {
      const page = await fetchRenderedPage(url);
      return page.html;
    } catch (e) {
      console.warn("[lead-engine] browserbase fetch failed", e instanceof Error ? e.message : e);
    }
  }

  const executablePath = chromiumExecutable();
  if (!executablePath) return null;

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage({ userAgent: BROWSER_UA });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await page.waitForTimeout(waitMs);
    return await page.content();
  } catch (e) {
    console.warn("[lead-engine] local browser fetch failed", e instanceof Error ? e.message : e);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
