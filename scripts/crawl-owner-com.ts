#!/usr/bin/env npx tsx
/**
 * Crawl owner.com via Browserbase (JS-rendered pages). Costs per session.
 *
 *   npm run crawl:owner
 * For free HTTP crawl: npm run crawl:owner:free
 *
 * Env: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverSiblingOrigins } from "../lib/audit/discover-related-sites";
import {
  fetchRenderedPageWithRetry,
  isBrowserbaseConfigured,
} from "../lib/browserbase/fetch-page";
import {
  extractPageSignals,
  parseArgs,
  resolveCrawlUrls,
  slugFromUrl,
  stampDir,
  writeCrawlOutput,
  type PageMeta,
} from "./owner-crawl-lib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { max, dryRun, singleUrl } = parseArgs(process.argv.slice(2));

  if (!dryRun && !isBrowserbaseConfigured()) {
    console.error("Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in .env.local");
    console.error("Use free crawl instead: npm run crawl:owner:free");
    process.exit(1);
  }

  process.env.AUDIT_VISUAL_METRICS = "0";

  const urls = await resolveCrawlUrls(max, singleUrl);
  const outRoot = resolve(ROOT, process.env.OWNER_CRAWL_OUT ?? "downloads/owner-crawl", stampDir());
  const pagesDir = resolve(outRoot, "pages");
  mkdirSync(pagesDir, { recursive: true });

  writeFileSync(
    resolve(outRoot, "urls.json"),
    JSON.stringify(
      { crawledAt: new Date().toISOString(), method: "browserbase", count: urls.length, urls },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log(`Dry run — would crawl ${urls.length} pages (Browserbase) → ${outRoot}`);
    urls.forEach((u) => console.log(" ", u));
    return;
  }

  const manifest: PageMeta[] = [];
  let homeHtml: string | null = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const slug = slugFromUrl(url);
    const label = `[${i + 1}/${urls.length}]`;
    console.log(`${label} ${url}`);
    try {
      const rendered = await fetchRenderedPageWithRetry(url);
      const signals = extractPageSignals(rendered.html, rendered.finalUrl);
      if (slug === "home") homeHtml = rendered.html;

      writeFileSync(resolve(pagesDir, `${slug}.html`), rendered.html, "utf8");
      const meta: PageMeta = {
        method: "browserbase",
        url,
        finalUrl: rendered.finalUrl,
        statusCode: rendered.statusCode,
        htmlBytes: Buffer.byteLength(rendered.html, "utf8"),
        ...signals,
      };
      writeFileSync(resolve(pagesDir, `${slug}.json`), JSON.stringify(meta, null, 2));
      manifest.push(meta);
      console.log(`${label} OK ${meta.title ?? "(no title)"} (${meta.htmlBytes} bytes)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${label} FAIL`, msg);
      manifest.push({
        method: "browserbase",
        url,
        finalUrl: url,
        statusCode: null,
        title: null,
        metaDescription: null,
        h1: [],
        htmlBytes: 0,
        internalLinkCount: 0,
        error: msg,
      });
    }
  }

  writeCrawlOutput(outRoot, "browserbase", urls, manifest, homeHtml, discoverSiblingOrigins);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
