#!/usr/bin/env npx tsx
/**
 * Free Owner.com crawl — plain HTTP fetch (no Browserbase billing).
 *
 *   npm run crawl:owner:free
 *   npm run crawl:owner:free -- --max=10
 *   npm run crawl:owner:free -- --dry-run
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverSiblingOrigins } from "../lib/audit/discover-related-sites";
import { fetchHtmlForAudit } from "../lib/audit/analyze-url";
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
  const { max, dryRun, singleUrl } = parseArgs([...process.argv.slice(2), "--free"]);

  const urls = await resolveCrawlUrls(max, singleUrl);

  if (dryRun) {
    console.log(`Dry run (free fetch) — would crawl ${urls.length} pages`);
    urls.forEach((u) => console.log(" ", u));
    return;
  }

  const outRoot = resolve(ROOT, process.env.OWNER_CRAWL_OUT ?? "downloads/owner-crawl", stampDir());
  const pagesDir = resolve(outRoot, "pages");
  mkdirSync(pagesDir, { recursive: true });

  writeFileSync(
    resolve(outRoot, "urls.json"),
    JSON.stringify(
      { crawledAt: new Date().toISOString(), method: "fetch", count: urls.length, urls },
      null,
      2,
    ),
  );

  console.log(`Free crawl: ${urls.length} pages (HTTP fetch, no Browserbase cost)\n`);

  const manifest: PageMeta[] = [];
  let homeHtml: string | null = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const slug = slugFromUrl(url);
    const label = `[${i + 1}/${urls.length}]`;
    console.log(`${label} ${url}`);

    const fetched = await fetchHtmlForAudit(url);
    if (!fetched) {
      console.error(`${label} FAIL fetch returned nothing`);
      manifest.push({
        method: "fetch",
        url,
        finalUrl: url,
        statusCode: null,
        title: null,
        metaDescription: null,
        h1: [],
        htmlBytes: 0,
        internalLinkCount: 0,
        error: "fetch_failed",
      });
      continue;
    }

    const signals = extractPageSignals(fetched.html, fetched.finalUrl);
    if (slug === "home") homeHtml = fetched.html;

    const meta: PageMeta = {
      method: "fetch",
      url,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.status,
      htmlBytes: Buffer.byteLength(fetched.html, "utf8"),
      ...signals,
    };
    manifest.push(meta);
    writeFileSync(resolve(pagesDir, `${slug}.html`), fetched.html, "utf8");
    writeFileSync(resolve(pagesDir, `${slug}.json`), JSON.stringify(meta, null, 2));
    console.log(`${label} OK ${meta.title ?? "(no title)"} (${meta.htmlBytes} bytes)`);
  }

  writeCrawlOutput(outRoot, "fetch", urls, manifest, homeHtml, discoverSiblingOrigins);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
