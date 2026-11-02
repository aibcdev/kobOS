# Long-tail SEO programme: report

Branch `seo-longtail`, off main. Status 2 Nov 2026: **stopped at checkpoint B1** (approve the 30 phrases). Method A is waiting on a Search Console export.

## What's in the branch

| File | What it is |
|---|---|
| `seo/config.yaml` | The site config, filled from the code and the live site. Every TO CONFIRM is in OPEN_QUESTIONS.md. |
| `seo/OPEN_QUESTIONS.md` | What I need from you before going further. |
| `seo/keywords/keywords.csv` | 30 phrases, each pointing at a page that returned 200 today. |
| `lib/seo/gsc-shortlist.ts`, `scripts/seo-shortlist.ts` | The Method A shortlist: 8+ word queries, at least 20 impressions, CTR at or under 2%, scored and grouped. `npm run seo:shortlist`. |
| `lib/seo/*.test.ts` | Tests for the scoring and for the phrase list. The phrase list test fails if a target page drops out of the sitemap, points at ordering or delivery, or a phrase uses AI, LLM, GPT, POS or phone wording. |
| `seo/answers/changelog.md`, `seo/measure/baseline.md` | Empty logs, ready for round one. |

## Changes from the generic prompt

- **TypeScript, not Python.** The repo has no Python toolchain in CI. The shortlist and checks are TypeScript with vitest tests, like the other scripts.
- **No new answer box component.** Guides already have the "In short" TL;DR box under the H1 (PR #63). Method A answers go into that box and the guide's existing FAQ list, which already outputs FAQPage JSON-LD.
- **FAQ markup won't show as rich results.** Since 2023 Google only shows FAQ rich results for government and health sites. The markup is still valid and helps answer engines read the page. Don't expect a visual change in search.
- **No query-to-page pairs in the normal export.** The Queries tab in Search Console doesn't say which page ranked. Either export with a Page filter, one page at a time (the script reads any file with a page column), or match by hand at checkpoint A1.
- **Search Console exports stay out of git.** `seo/gsc/raw/*.csv` is in .gitignore.
- **Live pages mean production.** The tools pages and /press from #63 return 404 until it deploys, so nothing points at them yet.

## What you do by hand

### Method A: Search Console export
1. Search Console → trykob.com → **Performance → Search results**, last 3 months, tick all four metrics.
2. **Query → Custom (regex)**: `^(?:\S+\s+){7,}\S+$` (8+ words).
3. Export, and put the Queries CSV in `seo/gsc/raw/`. For page matching, also export once per top page with a **Page** filter added.
4. Run `npm run seo:shortlist`. If fewer than 10 rows come back, run `npm run seo:shortlist -- --min-words 5` (in Search Console, the regex `^(?:\S+\s+){4,}\S+$`), or use Bing Webmaster Tools.
5. Send me the top 25 for checkpoint A1.

### Method B
- Answer OPEN_QUESTIONS 1 to 4. After that I draft 5 sample posts and images (checkpoint B2). The rest come after B2.
- You post by hand from `seo/social/schedule.csv` and fill in the `posted` and `url` columns.

### Measuring
- Fill in `seo/measure/baseline.md` the day the first post goes out. Check again at day 28 and day 56.
