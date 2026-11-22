# SEO data pack: report

Crawled https://trykob.com on 2026-11-22: 41 URLs. Findings: 6 high, 33 medium, 60 low.

Built by `npm run seo:pack` (`lib/seo/pack-checks.ts`). Each finding names the file to change. Nothing here has been fixed yet.

> No Search Console exports in seo/gsc/raw yet, so the competing-query, striking-distance and not-indexed checks didn't run. Title overlap stands in for competing pages. See seo/pack/README.md.
> Landing pages and conversions skipped. Run with --landing once PR #66 is live.

## Indexing (5)

| | Page | Finding | File |
|---|---|---|---|
| high | `/audit` | In the sitemap but redirects (307) to /scan. List the destination instead. | app/(marketing)/audit/page.tsx |
| high | `/go/audit` | Canonical points at /audit, which returns 307 → /scan. | app/(marketing)/go/audit/page.tsx |
| low | `/data-management` | Indexable but missing from the sitemap. Add it, or noindex it if it shouldn't rank. | app/(marketing)/data-management/page.tsx |
| low | `/onboard` | Indexable but missing from the sitemap. Add it, or noindex it if it shouldn't rank. | app/(marketing)/onboard/page.tsx |
| low | `/scan` | Indexable but missing from the sitemap. Add it, or noindex it if it shouldn't rank. | app/(marketing)/scan/page.tsx |

## Pages competing for the same search (3)

| | Page | Finding | File |
|---|---|---|---|
| medium | `/resources/best-restaurant-marketing-software-for-independents` | Title/H1 nearly matches /resources/best-restaurant-marketing-software-uk-independents (88% of words shared). Make each answer a different question, or merge them. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-independents") |
| medium | `/resources/best-restaurant-marketing-software-for-independents` | Title/H1 nearly matches /resources/best-restaurant-marketing-software-for-india-independents (88% of words shared). Make each answer a different question, or merge them. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-independents") |
| medium | `/resources/popmenu-vs-owner-com-vs-kob` | Title/H1 nearly matches /resources/kob-vs-owner-com-which-is-better (88% of words shared). Make each answer a different question, or merge them. | lib/marketing/resources/articles.ts (slug "popmenu-vs-owner-com-vs-kob") |

## Titles and H1s (13)

| | Page | Finding | File |
|---|---|---|---|
| high | `/` | Same title as /onboard, /data-management, /scan. | app/(marketing)/page.tsx |
| high | `/data-management` | Same title as /, /onboard, /scan. | app/(marketing)/data-management/page.tsx |
| high | `/onboard` | Same title as /, /data-management, /scan. | app/(marketing)/onboard/page.tsx |
| high | `/scan` | Same title as /, /onboard, /data-management. | app/(marketing)/scan/page.tsx |
| low | `/about` | Title is only 11 characters: "About \| KOB". | app/(marketing)/about/page.tsx |
| low | `/resources/best-google-business-profile-tools-for-restaurants` | Title is 63 characters; Google cuts it at about 60: "Best Google Business Profile Tools for Restaurants (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-google-business-profile-tools-for-restaurants") |
| low | `/resources/best-restaurant-marketing-software-for-independents` | Title is 64 characters; Google cuts it at about 60: "Best Restaurant Marketing Software for Independents (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-independents") |
| low | `/resources/best-restaurant-marketing-software-for-india-independents` | Title is 70 characters; Google cuts it at about 60: "Best Restaurant Marketing Software for India Independents (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-india-independents") |
| low | `/resources/best-restaurant-marketing-software-uk-independents` | Title is 67 characters; Google cuts it at about 60: "Best Restaurant Marketing Software for UK Independents (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-uk-independents") |
| low | `/resources/best-tools-to-keep-google-listing-hours-accurate` | Title is 61 characters; Google cuts it at about 60: "Best Tools to Keep Google Listing Hours Accurate (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-tools-to-keep-google-listing-hours-accurate") |
| low | `/resources/best-ways-to-get-more-restaurant-customers-online` | Title is 62 characters; Google cuts it at about 60: "Best Ways to Get More Restaurant Customers Online (2026) \| KOB". | lib/marketing/resources/articles.ts (slug "best-ways-to-get-more-restaurant-customers-online") |
| low | `/resources/restaurant-marketing-software-vs-agency` | Title is 63 characters; Google cuts it at about 60: "Restaurant Marketing Software vs Agency: Which Is Better? \| KOB". | lib/marketing/resources/articles.ts (slug "restaurant-marketing-software-vs-agency") |
| low | `/roadmap` | Title is only 13 characters: "Roadmap \| KOB". | app/(marketing)/roadmap/page.tsx |

## Meta descriptions (8)

| | Page | Finding | File |
|---|---|---|---|
| medium | `/` | Same description as /onboard, /data-management, /scan. | app/(marketing)/page.tsx |
| medium | `/data-management` | Same description as /, /onboard, /scan. | app/(marketing)/data-management/page.tsx |
| medium | `/onboard` | Same description as /, /data-management, /scan. | app/(marketing)/onboard/page.tsx |
| medium | `/scan` | Same description as /, /onboard, /data-management. | app/(marketing)/scan/page.tsx |
| low | `/` | Description is 186 characters; keep it under 160. | app/(marketing)/page.tsx |
| low | `/data-management` | Description is 186 characters; keep it under 160. | app/(marketing)/data-management/page.tsx |
| low | `/onboard` | Description is 186 characters; keep it under 160. | app/(marketing)/onboard/page.tsx |
| low | `/scan` | Description is 186 characters; keep it under 160. | app/(marketing)/scan/page.tsx |

## Internal links (26)

| | Page | Finding | File |
|---|---|---|---|
| medium | `/features/branding` | Only 0 internal link(s) point here. Link from: /features/menu. | app/(marketing)/features/branding/page.tsx |
| medium | `/features/delivery` | Only 0 internal link(s) point here. | app/(marketing)/features/delivery/page.tsx |
| medium | `/features/menu` | Only 0 internal link(s) point here. Link from: /features/branding. | app/(marketing)/features/menu/page.tsx |
| medium | `/features/online-ordering` | Only 0 internal link(s) point here. | app/(marketing)/features/online-ordering/page.tsx |
| medium | `/features/website` | Only 0 internal link(s) point here. | app/(marketing)/features/website/page.tsx |
| medium | `/resources/best-free-restaurant-seo-audit-tools` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-review-management-tools, /resources/restaurant-website-audit-tools-compared, /resources/best-google-business-profile-tools-for-restaurants. | lib/marketing/resources/articles.ts (slug "best-free-restaurant-seo-audit-tools") |
| medium | `/resources/best-google-business-profile-tools-for-restaurants` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-review-management-tools, /resources/best-tools-to-keep-google-listing-hours-accurate, /resources/best-free-restaurant-seo-audit-tools. | lib/marketing/resources/articles.ts (slug "best-google-business-profile-tools-for-restaurants") |
| medium | `/resources/best-restaurant-marketing-software-for-cafes` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-marketing-software-for-independents, /resources/best-restaurant-marketing-software-uk-independents, /resources/best-restaurant-marketing-software-for-india-independents. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-cafes") |
| medium | `/resources/best-restaurant-marketing-software-for-independents` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-marketing-software-uk-independents, /resources/best-restaurant-marketing-software-for-india-independents, /resources/best-restaurant-marketing-software-for-cafes. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-independents") |
| medium | `/resources/best-restaurant-marketing-software-for-india-independents` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-marketing-software-for-independents, /resources/best-restaurant-marketing-software-uk-independents, /resources/best-restaurant-marketing-software-for-cafes. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-india-independents") |
| medium | `/resources/best-restaurant-marketing-software-uk-independents` | Only 1 internal link(s) point here. Link from: /resources/best-restaurant-marketing-software-for-independents, /resources/best-restaurant-marketing-software-for-india-independents, /resources/best-restaurant-marketing-software-for-cafes. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-uk-independents") |
| medium | `/resources/best-restaurant-review-management-tools` | Only 1 internal link(s) point here. Link from: /resources/best-free-restaurant-seo-audit-tools, /resources/best-google-business-profile-tools-for-restaurants, /resources/best-tools-to-keep-google-listing-hours-accurate. | lib/marketing/resources/articles.ts (slug "best-restaurant-review-management-tools") |
| medium | `/resources/best-tools-to-keep-google-listing-hours-accurate` | Only 1 internal link(s) point here. Link from: /resources/best-google-business-profile-tools-for-restaurants, /resources/best-restaurant-review-management-tools, /resources/best-free-restaurant-seo-audit-tools. | lib/marketing/resources/articles.ts (slug "best-tools-to-keep-google-listing-hours-accurate") |
| medium | `/resources/best-ways-to-get-more-restaurant-customers-online` | Only 1 internal link(s) point here. | lib/marketing/resources/articles.ts (slug "best-ways-to-get-more-restaurant-customers-online") |
| medium | `/resources/kob-vs-bentobox-which-is-better` | Only 1 internal link(s) point here. Link from: /resources/kob-vs-popmenu-which-is-better, /resources/kob-vs-owner-com-which-is-better, /resources/restaurant-marketing-software-vs-agency. | lib/marketing/resources/articles.ts (slug "kob-vs-bentobox-which-is-better") |
| medium | `/resources/kob-vs-popmenu-which-is-better` | Only 1 internal link(s) point here. Link from: /resources/popmenu-vs-owner-com-vs-kob, /resources/kob-vs-bentobox-which-is-better, /resources/kob-vs-owner-com-which-is-better. | lib/marketing/resources/articles.ts (slug "kob-vs-popmenu-which-is-better") |
| medium | `/resources/owner-com-alternatives-compared` | Only 1 internal link(s) point here. Link from: /resources/owner-com-vs-agency-for-independents, /resources/owner-com-pricing-and-reviews-for-restaurants. | lib/marketing/resources/articles.ts (slug "owner-com-alternatives-compared") |
| medium | `/resources/owner-com-pricing-and-reviews-for-restaurants` | Only 1 internal link(s) point here. Link from: /resources/owner-com-vs-agency-for-independents, /resources/owner-com-alternatives-compared. | lib/marketing/resources/articles.ts (slug "owner-com-pricing-and-reviews-for-restaurants") |
| medium | `/resources/owner-com-vs-agency-for-independents` | Only 1 internal link(s) point here. Link from: /resources/kob-vs-owner-com-which-is-better, /resources/owner-com-alternatives-compared, /resources/owner-com-pricing-and-reviews-for-restaurants. | lib/marketing/resources/articles.ts (slug "owner-com-vs-agency-for-independents") |
| medium | `/resources/popmenu-vs-owner-com-vs-kob` | Only 1 internal link(s) point here. Link from: /resources/kob-vs-owner-com-which-is-better, /resources/kob-vs-popmenu-which-is-better, /resources/kob-vs-bentobox-which-is-better. | lib/marketing/resources/articles.ts (slug "popmenu-vs-owner-com-vs-kob") |
| medium | `/resources/replatform-vs-google-listing-hygiene-restaurants` | Only 1 internal link(s) point here. | lib/marketing/resources/articles.ts (slug "replatform-vs-google-listing-hygiene-restaurants") |
| medium | `/resources/restaurant-marketing-software-vs-agency` | Only 1 internal link(s) point here. Link from: /resources/kob-vs-bentobox-which-is-better, /resources/kob-vs-popmenu-which-is-better, /resources/kob-vs-owner-com-which-is-better. | lib/marketing/resources/articles.ts (slug "restaurant-marketing-software-vs-agency") |
| medium | `/resources/restaurant-website-audit-tools-compared` | Only 1 internal link(s) point here. Link from: /resources/best-free-restaurant-seo-audit-tools, /resources/best-restaurant-review-management-tools. | lib/marketing/resources/articles.ts (slug "restaurant-website-audit-tools-compared") |
| medium | `/scan` | Only 0 internal link(s) point here. Link from: /, /onboard, /data-management. | app/(marketing)/scan/page.tsx |
| medium | `/solutions` | Only 0 internal link(s) point here. | app/(marketing)/solutions/page.tsx |
| medium | `/trial` | Only 1 internal link(s) point here. Link from: /, /onboard, /data-management. | app/(marketing)/trial/page.tsx |

## Thin pages (10)

| | Page | Finding | File |
|---|---|---|---|
| low | `/about` | About 127 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/about/page.tsx |
| low | `/demo` | About 251 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/demo/page.tsx |
| low | `/features/branding` | About 226 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/features/branding/page.tsx |
| low | `/features/delivery` | About 226 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/features/delivery/page.tsx |
| low | `/features/menu` | About 239 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/features/menu/page.tsx |
| low | `/features/online-ordering` | About 243 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/features/online-ordering/page.tsx |
| low | `/onboard` | About 96 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/onboard/page.tsx |
| low | `/roadmap` | About 171 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/roadmap/page.tsx |
| low | `/scan` | About 126 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/scan/page.tsx |
| low | `/solutions` | About 186 words of text. Thin pages rarely rank; add a real answer or fold it into a stronger page. | app/(marketing)/solutions/page.tsx |

## Forms and page structure (34)

| | Page | Finding | File |
|---|---|---|---|
| low | `/demo` | No <main> element. | app/(marketing)/demo/page.tsx |
| low | `/features/branding` | No <main> element. | app/(marketing)/features/branding/page.tsx |
| low | `/features/delivery` | No <main> element. | app/(marketing)/features/delivery/page.tsx |
| low | `/features/menu` | No <main> element. | app/(marketing)/features/menu/page.tsx |
| low | `/features/online-ordering` | No <main> element. | app/(marketing)/features/online-ordering/page.tsx |
| low | `/features/website` | No <main> element. | app/(marketing)/features/website/page.tsx |
| low | `/for-ai` | No <main> element. | app/(marketing)/for-ai/page.tsx |
| low | `/onboard` | 1 form field(s) without a label. | app/(marketing)/onboard/page.tsx |
| low | `/onboard` | No <main> element. | app/(marketing)/onboard/page.tsx |
| low | `/pricing` | No <main> element. | app/(marketing)/pricing/page.tsx |
| low | `/product` | No <main> element. | app/(marketing)/product/page.tsx |
| low | `/resources` | No <main> element. | app/(marketing)/resources/page.tsx |
| low | `/resources/best-free-restaurant-seo-audit-tools` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-free-restaurant-seo-audit-tools") |
| low | `/resources/best-google-business-profile-tools-for-restaurants` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-google-business-profile-tools-for-restaurants") |
| low | `/resources/best-restaurant-marketing-software-for-cafes` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-cafes") |
| low | `/resources/best-restaurant-marketing-software-for-independents` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-independents") |
| low | `/resources/best-restaurant-marketing-software-for-india-independents` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-for-india-independents") |
| low | `/resources/best-restaurant-marketing-software-uk-independents` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-restaurant-marketing-software-uk-independents") |
| low | `/resources/best-restaurant-review-management-tools` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-restaurant-review-management-tools") |
| low | `/resources/best-tools-to-keep-google-listing-hours-accurate` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-tools-to-keep-google-listing-hours-accurate") |
| low | `/resources/best-ways-to-get-more-restaurant-customers-online` | No <main> element. | lib/marketing/resources/articles.ts (slug "best-ways-to-get-more-restaurant-customers-online") |
| low | `/resources/kob-vs-bentobox-which-is-better` | No <main> element. | lib/marketing/resources/articles.ts (slug "kob-vs-bentobox-which-is-better") |
| low | `/resources/kob-vs-owner-com-which-is-better` | No <main> element. | lib/marketing/resources/articles.ts (slug "kob-vs-owner-com-which-is-better") |
| low | `/resources/kob-vs-popmenu-which-is-better` | No <main> element. | lib/marketing/resources/articles.ts (slug "kob-vs-popmenu-which-is-better") |
| low | `/resources/owner-com-alternatives-compared` | No <main> element. | lib/marketing/resources/articles.ts (slug "owner-com-alternatives-compared") |
| low | `/resources/owner-com-pricing-and-reviews-for-restaurants` | No <main> element. | lib/marketing/resources/articles.ts (slug "owner-com-pricing-and-reviews-for-restaurants") |
| low | `/resources/owner-com-vs-agency-for-independents` | No <main> element. | lib/marketing/resources/articles.ts (slug "owner-com-vs-agency-for-independents") |
| low | `/resources/popmenu-vs-owner-com-vs-kob` | No <main> element. | lib/marketing/resources/articles.ts (slug "popmenu-vs-owner-com-vs-kob") |
| low | `/resources/replatform-vs-google-listing-hygiene-restaurants` | No <main> element. | lib/marketing/resources/articles.ts (slug "replatform-vs-google-listing-hygiene-restaurants") |
| low | `/resources/restaurant-marketing-software-vs-agency` | No <main> element. | lib/marketing/resources/articles.ts (slug "restaurant-marketing-software-vs-agency") |
| low | `/resources/restaurant-website-audit-tools-compared` | No <main> element. | lib/marketing/resources/articles.ts (slug "restaurant-website-audit-tools-compared") |
| low | `/scan` | 1 form field(s) without a label. | app/(marketing)/scan/page.tsx |
| low | `/solutions` | No <main> element. | app/(marketing)/solutions/page.tsx |
| low | `/trial` | No <main> element. | app/(marketing)/trial/page.tsx |
