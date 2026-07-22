import { describe, expect, it } from "vitest";
import { analyzeWebsiteFromHtml } from "@/lib/audit/analyze-url";

describe("analyzeWebsiteFromHtml SEO depth", () => {
  it("extracts headings, schema, alts, lang, and noindex", () => {
    const html = `<!doctype html>
<html lang="en-GB">
<head>
  <title>Coastal Kitchen | Seafood in Brighton</title>
  <meta name="description" content="Fresh seafood and coastal plates in Brighton. Book a table for dinner tonight near the pier." />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:title" content="Coastal Kitchen" />
  <meta property="og:image" content="https://example.com/og.jpg" />
  <link rel="canonical" href="https://example.com/" />
  <script type="application/ld+json">{"@type":"Restaurant","name":"Coastal Kitchen"}</script>
</head>
<body>
  <h1>Coastal Kitchen</h1>
  <h2>Menus</h2>
  <h2>Book</h2>
  <img src="/a.jpg" alt="Grilled sea bass" />
  <img src="/b.jpg" />
  <a href="tel:+441273000000">Call</a>
  <a href="/book">Reserve a table</a>
</body>
</html>`;

    const { signals } = analyzeWebsiteFromHtml(html, "https://example.com/");
    expect(signals.fetched).toBe(true);
    expect(signals.titleLen).toBeGreaterThan(20);
    expect(signals.hasMetaDescription).toBe(true);
    expect(signals.metaDescriptionLen).toBeGreaterThan(70);
    expect(signals.h1Count).toBe(1);
    expect(signals.h2Count).toBe(2);
    expect(signals.hasJsonLd).toBe(true);
    expect(signals.hasRestaurantSchema).toBe(true);
    expect(signals.hasLangAttr).toBe(true);
    expect(signals.hasNoindex).toBe(false);
    expect(signals.imgCount).toBe(2);
    expect(signals.imgWithAltCount).toBe(1);
    expect(signals.hasOgImage).toBe(true);
  });

  it("flags noindex meta", () => {
    const html = `<html><head>
      <title>Hidden</title>
      <meta name="robots" content="noindex, nofollow" />
    </head><body><h1>Hidden</h1></body></html>`;
    const { signals } = analyzeWebsiteFromHtml(html, "https://example.com/");
    expect(signals.hasNoindex).toBe(true);
  });
});
