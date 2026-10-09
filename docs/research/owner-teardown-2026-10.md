# Owner.com restaurant sites: public teardown (2026-10-09)

What Owner.com actually ships on the restaurant websites it builds. These are observations from a normal guest visit only: public pages and the network calls a browser makes while loading them and the menu. No logins, no orders placed, no app decompiling, and no private API calls. Companion to [`docs/OWNER-COMPETITOR-INTEL.md`](../OWNER-COMPETITOR-INTEL.md) (pricing, dashboard, design system).

**Method:**
- Tool: [REA](https://github.com/morluto/rea) v6.1.0 (`analyze-web-bundle` over Chrome DevTools).
- Page captures: Playwright attached to the same Chrome, recording request hosts, cookies, JSON-LD and the footer.
- Speed and SEO: Lighthouse 12, mobile, one run per site, from the UK on 2026-10-09.
- Raw captures were kept locally and not committed. The trimmed HTML fixtures live in `lib/audit/__fixtures__/site-platform/`.

## Sample

| Site | Platform | How identified |
|------|----------|----------------|
| doodahdiner.com | Owner | Owner case study; `owner-*` cookies; "Powered by Owner" |
| cyclonoodles.com | Owner | Owner case study; `static-content.owner.com` |
| metropizza.com | Owner | Owner case study; `owner-*` cookies |
| gyroconcept.com | Owner | Owner case study; `owner-*` cookies |
| karvgreek.com | Owner | Owner case study; `scout-assets.owner.sh` |
| talkintacos.net | Owner | Owner case study; `owner-*` cookies |
| diciccos.com | Owner | Owner meta-description template; `owner-*` cookies |
| jordansfishandchicken.com | Owner | Owner meta-description template; `owner-*` cookies |
| legacyrolls.toast.site | Toast | toast.site domain, "Powered by Toast" |
| my-site-109335.square.site | Square Online | generator `Square Online` |
| frascafoodandwine.com, tavernettadenver.com | BentoBox | `getbento.com` assets |
| mattengaspizzeria.com, ottavio.com | Wix | generator `Wix.com Website Builder` |
| joespizzanyc.com | Squarespace | Squarespace CDNs |
| hillcrustpizza.com | Webflow (+ SpotOn ordering) | `website-files.com`, `o.spoton.com` |
| rigatonys.com, bestiala.com | WordPress | generator WordPress / Elementor |
| goicuon.com | ChowNow (hosted ordering only) | redirects to `order.chownow.com` |

Some guessed domains for Owner case studies were wrong: they were parked, or the restaurant had moved to another vendor (Saffron, Ashley's Cafe, Hillcrust). Only confirmed Owner sites are in the Owner rows.

## What every Owner site has in common

**Stack**
- Server-rendered [Astro](https://astro.build) pages (`/_astro/*.js`), with React islands built by Vite. REA parsed 86 scripts and 4 source maps on the Doo-Dah Diner menu page.
- Served behind Cloudflare. The `owner-worker-version` cookie and `/cdn-cgi/rum` indicate Workers.
- Monitoring and analytics:
  - Datadog Real User Monitoring (`datadoghq-browser-agent.com`).
  - Cloudflare Web Analytics.
  - PostHog, proxied on the restaurant's own domain (`/api/ph/`).
  - Google Tag Manager offloaded to a web worker with Partytown (`/~partytown/proxytown`) where the restaurant uses it.

**Bot challenge**
- Plain HTTP clients, including the KOB audit fetch and `curl`, get a 403 Cloudflare "Just a moment..." challenge. Headless Chrome is challenged too.
- A normal browser gets through. That's why the audit needs a rendered Browserbase session for Owner sites.

**Ordering stays on the restaurant's domain**
- Menu at `/menu`; the order sheet opens at `/menu?dialogState=orderDetails`.
- Cart and timing calls: `/api/olympus/carts/v3/{id}` and `/api/olympus/carts/v4/{id}/available-times`.
- Guest session: `/api/olympus/auth/v1/mercury/session`.
- Delivery checks: `/delivery/v1/locations/deliverable`.
- REA also found cart operation names in the bundle (`carts.v3.cart.calculateLocationOptions`, `carts.v3.cart.verifyLocationDeliverability`) and an Uber OAuth handoff (`/oauth/uber/complete`, `UberHandoffCapture`), which looks like Uber Direct delivery.

**Branded app and loyalty**
- Every footer has "Download our app" and "Earn points for free food".
- Store badges point to `com.owner.<brand>` Android bundles, for example `com.owner.doodahdiner`.

**SEO template.** Identical on every site; only the cuisine, city and name change:
- Title: `{Name} | Best {Cuisine} in {City} | {Cuisine} near me`
- H1: `Best {Cuisine} in {City}`
- Meta description: `{Name}: the best {Cuisine} in {City}. Order directly online today for takeout or delivery. Save money, support local business!`
- JSON-LD: `Restaurant` or `Organization` (with `subOrganization` locations, `hasMenu`, `OrderAction`, and a long `keywords` list of dishes), plus `FAQPage`.
- The menu is real text: the Doo-Dah Diner menu page has 96 crawlable prices, not a PDF or image.

**Experimentation:** `/universal-log-exposure/` calls and `owner-universal-flags` / `owner-apollo-segregation-reason` cookies suggest site-wide A/B testing.

## Speed and SEO (Lighthouse mobile, one run each)

| Site | Platform | Performance | SEO | LCP |
|------|----------|------------:|----:|----:|
| talkintacos.net | Owner | 100 | 100 | 1.7 s |
| metropizza.com | Owner | 97 | 100 | 2.4 s |
| doodahdiner.com | Owner | 94 | 92 | 2.7 s |
| diciccos.com | Owner | 86 | 100 | 4.1 s |
| joespizzanyc.com | Squarespace | 71 | 92 | 7.3 s |
| tavernettadenver.com | BentoBox | 66 | 100 | 6.2 s |
| rigatonys.com | WordPress | 56 | 77 | 22.6 s |
| mattengaspizzeria.com | Wix | 55 | 100 | 19.0 s |
| legacyrolls.toast.site | Toast | 41 | 92 | 24.6 s |
| my-site-109335.square.site | Square Online | 18 | 100 | 14.7 s |

Owner's sites are the fastest in this sample. These are single runs from one location, so treat the numbers as directional only.

## What this means for KOB

**Don't attack Owner's websites.** Their technical SEO, speed and on-domain ordering are strong. "Your Owner site is slow" or "missing schema" will usually be false. The audit must only say what it measured on that specific site.

**Where Owner is weak (from public pages):**
- **One template for everyone.** Every site has the same "Best {Cuisine} in {City}" title, H1 and meta copy, so each page reads like every other Owner site. KOB's angle is the restaurant's own voice and the jobs around the site, not the site itself.
- **The website is the product.** Owner's offer is ordering, app, loyalty and marketing. KOB's wedge is the manager work Owner doesn't show on the site: Google listing hours, review replies in the owner's tone, invoice and cost watch, and prep. Approve before anything goes live. See [`docs/PRODUCT-INTERVIEW.md`](../PRODUCT-INTERVIEW.md).
- **Price.** Owner publishes $249–$499/mo (see the intel doc). KOB founding is $99/mo, or £79 in the UK.
- **UK.** Every Owner site in the sample is in the US.

**Sales use:**
- Restaurants already on Owner aren't "bad website" leads. They're "you already pay for a website; KOB does the work around it" leads.
- Restaurants on Square Online, Toast sites or Wix with slow mobile pages are the strongest website-gap leads, provided their own scan shows the gap.

## Limitations

- Public guest view only. Owner's backend, dashboard, POS and data are not visible, and nothing here describes their internal infrastructure.
- Endpoint names come from captured network traffic and REA's static analysis of shipped JavaScript. They show what the browser calls, not how Owner's servers work.
- 8 Owner sites, all in the US; contrast platforms have 1–2 sites each.
- Lighthouse numbers are single runs and vary with network conditions and caching.
- PageSpeed Insights could not be used. With `PAGESPEED_API_KEY` empty, `lib/audit/pagespeed-insights.ts` falls back to the Gemini key, which the PageSpeed API rejects, and keyless calls hit the daily quota.
