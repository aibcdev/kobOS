#!/usr/bin/env npx tsx
/**
 * Ping IndexNow (Bing/Yandex/etc.) after publishing resource articles.
 *
 *   INDEXNOW_KEY=... npm run resources:indexnow
 *   INDEXNOW_KEY=... npx tsx scripts/resources-indexnow.ts [slug...]
 *
 * Host `https://trykob.com/{INDEXNOW_KEY}.txt` containing the same key.
 */
import { listResourceArticles, articlePath } from "../lib/marketing/resources";
import { getSiteUrl } from "../lib/site-url";

async function main() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    console.error("Set INDEXNOW_KEY (and host /{key}.txt on the site).");
    process.exit(1);
  }
  const host = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "") || "trykob.com";
  const base = `https://${host}`;
  const slugs = process.argv.slice(2);
  const articles = listResourceArticles().filter((a) => !slugs.length || slugs.includes(a.slug));
  const urlList = [
    `${base}/resources`,
    `${base}/for-ai`,
    `${base}/llms.txt`,
    ...articles.map((a) => `${base}${articlePath(a.slug)}`),
  ];

  const body = {
    host,
    key,
    keyLocation: `${base}/${key}.txt`,
    urlList,
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(JSON.stringify({ status: res.status, submitted: urlList.length, urlList }, null, 2));
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
