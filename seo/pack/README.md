# SEO data pack

Noel Ceta's point (X, 21 Nov 2026): a model gives generic SEO advice unless you hand it your own data. This folder is that data for trykob.com, plus the checks that need no judgement, run in code.

```sh
npm run seo:pack -- --base https://trykob.com             # crawl production (one request every 0.5s), run every check
npm run seo:pack -- --base http://localhost:3000          # a local `next build && next start`
npm run seo:pack -- --base https://trykob.com --landing   # also 28 days of visits and audits (needs PR #66 live)
```

It writes `seo/pack/REPORT.md`, with findings ranked high, medium, low and the file to change for each, plus the CSVs below. `baseline-2026-11-22/` is the first run against production, from the crawl only.

## The six data sets

| Data | Where it comes from | File | Status |
|---|---|---|---|
| Site crawl (in place of Screaming Frog) | `lib/seo/site-crawl.ts`: sitemap plus internal links, raw HTML, no JavaScript | `crawl.csv` | Automatic |
| Search Console: queries | Performance → Search results → last 3 months → **Queries** tab → Export | `seo/gsc/raw/*.csv` → `gsc-queries.csv` | Needs Akeem: trykob.com isn't verified yet |
| Search Console: pages | Same report → **Pages** tab → Export | → `gsc-pages.csv` | Needs Akeem |
| Search Console: query + page | Same report, add a **Page** filter for one page, export Queries, and repeat for the top pages. Or use the Search Console API or Looker Studio for a file with both a query and a page column | → `gsc-query-page.csv` | Needs Akeem |
| Search Console: not indexed | Indexing → Pages → click a reason (e.g. "Crawled - currently not indexed") → Export. **Keep the reason as the file name** | → `gsc-indexing.csv` | Needs Akeem |
| Landing pages and conversions | `SiteVisitDay` visits and visitor audits by landing page, read-only (PR #66) | `landing.csv` | After #66 merges |

Drop every Search Console export into `seo/gsc/raw/` as it comes; the script works out which is which from the columns. The 8+ word filter for long questions is in `seo/REPORT.md` (Method A). Search Console files and `landing.csv` are gitignored, and only the crawl and the report are committed.

Links (Search Console → Links → Export) aren't read by the script yet; the crawl covers internal links. Put the external links export in a Claude Project by hand if you want it.

## What the checks cover

- **Indexing:** sitemap URLs that redirect, error or are noindex; canonicals pointing at a redirect; indexable pages missing from the sitemap; Search Console "not indexed" URLs explained against the crawl.
- **Competing pages:** with query+page data, queries where two or more of our pages split impressions. Without it, pages whose titles nearly match, ignoring the site-wide suffix.
- **Striking distance:** queries at positions 4–20, grouped by page.
- **Titles, H1s, descriptions:** missing, duplicate, too long.
- **Internal links:** pages with fewer than two links in, with suggested pages to link from.
- **Thin pages, banned wording** (`lib/copy/banned-words.ts`), unlabelled form fields, missing `<main>`.
- **Visits with no audits** (with `--landing`).

## Using it in a Claude Project (optional)

Upload `REPORT.md`, `crawl.csv`, the `gsc-*.csv` files and `landing.csv`, plus `lib/marketing/feature-status.ts` and `lib/billing/regional-pricing.ts`, so prices and feature status come from the code. Then use this as the project instruction:

> You're helping with SEO for trykob.com, a restaurant manager for independent restaurants. Use only the attached data, and say which file and row each recommendation comes from. Rules for any copy you suggest: never use the word "AI" or describe KOB as automated; take prices and the trial only from the attached code (£79 UK, $99 elsewhere, 7 days free, no card); only call a feature live if `feature-status.ts` says so; never invent numbers, customers, reviews or competitor facts; prefer improving or merging existing pages over adding new thin ones. Give each change as: page, file, what to change, and why, with the data that shows it.

Fixes found here go in their own reviewed PR. This folder never changes the site.
