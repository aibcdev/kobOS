import { describe, expect, it } from "vitest";
import { crawlSite, crawlToCsv, internalPath, parsePage, sitemapPaths } from "./site-crawl";

const PAGE = `<!doctype html><html><head>
<title>Pricing &amp; trial | KOB</title>
<meta name="description" content="£79 in the UK, $99 elsewhere.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://trykob.com/pricing">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","offers":{"@type":"Offer"}}</script>
<script>var ignored = "<h1>not a heading</h1>";</script>
</head><body><main>
<h1>One price. <em>Per location.</em></h1>
<h2>How much does KOB cost?</h2>
<p>Seven days free, no card.</p>
<a href="/trial">Trial</a> <a href="/trial/">Again</a> <a href="https://www.trykob.com/product?x=1#y">Product</a>
<a href="https://owner.com/pricing">Owner</a> <a href="mailto:hello@trykob.com">Email</a>
<label for="q">Restaurant</label><input id="q"><input placeholder="City"><label>Email <input type="email"></label>
<input type="hidden" name="t"><input aria-label="Search">
</main></body></html>`;

describe("parsePage", () => {
  const p = parsePage(PAGE, "https://trykob.com/pricing");

  it("reads head tags, headings and structured data, ignoring scripts", () => {
    expect(p).toMatchObject({
      path: "/pricing",
      title: "Pricing & trial | KOB",
      description: "£79 in the UK, $99 elsewhere.",
      canonical: "https://trykob.com/pricing",
      noindex: false,
      h1: ["One price. Per location."],
      firstH2: "How much does KOB cost?",
      hasMain: true,
    });
    expect(p.jsonLdTypes.sort()).toEqual(["Offer", "Organization"]);
  });

  it("keeps same-host links once each, dropping other sites, mailto and query strings", () => {
    expect(p.links.sort()).toEqual(["/product", "/trial"]);
  });

  it("counts form fields with no label, aria-label or wrapping label", () => {
    expect(p.unlabelledInputs).toBe(1);
  });

  it("spots noindex", () => {
    expect(parsePage('<meta name="robots" content="noindex, follow"><h1>x</h1>', "https://trykob.com/scan").noindex).toBe(true);
  });
});

describe("helpers", () => {
  it("normalises internal paths", () => {
    expect(internalPath("/resources/", "https://trykob.com/")).toBe("/resources");
    expect(internalPath("../pricing", "https://trykob.com/resources/x")).toBe("/pricing");
    expect(internalPath("tel:+44", "https://trykob.com/")).toBeNull();
  });

  it("reads sitemap locations as paths", () => {
    expect(sitemapPaths("<urlset><url><loc>https://trykob.com</loc></url><url><loc> https://trykob.com/pricing/ </loc></url></urlset>")).toEqual(["/", "/pricing"]);
  });
});

describe("crawlSite", () => {
  const site: Record<string, { status: number; body?: string; location?: string; type?: string }> = {
    "/sitemap.xml": { status: 200, body: "<loc>https://trykob.com/</loc><loc>https://trykob.com/audit</loc><loc>https://trykob.com/lonely</loc>", type: "application/xml" },
    "/": { status: 200, body: '<title>Home</title><h1>Home</h1><a href="/pricing">p</a><a href="/app">app</a>' },
    "/pricing": { status: 200, body: '<title>Pricing</title><h1>Pricing</h1><a href="/">home</a>' },
    "/audit": { status: 308, location: "/scan" },
    "/scan": { status: 200, body: '<meta name="robots" content="noindex"><h1>Scan</h1>' },
    "/lonely": { status: 200, body: "<h1>Lonely</h1>" },
  };
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    const page = site[path] ?? { status: 404, body: "" };
    return new Response(page.body ?? null, {
      status: page.status,
      headers: { "content-type": page.type ?? "text/html", ...(page.location ? { location: page.location } : {}) },
    });
  }) as typeof fetch;

  it("follows links and the sitemap, records redirects and never enters signed-in areas", async () => {
    const { pages, sitemap } = await crawlSite({ base: "https://trykob.com", delayMs: 0, fetchImpl: fakeFetch });
    expect(sitemap).toEqual(["/", "/audit", "/lonely"]);
    const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));
    expect(Object.keys(byPath).sort()).toEqual(["/", "/audit", "/lonely", "/pricing", "/scan"]);
    expect(byPath["/audit"]).toMatchObject({ status: 308, redirectTo: "/scan" });
    expect(byPath["/pricing"].depth).toBe(1);
    expect(byPath["/lonely"].depth).toBe(-1);
    expect(crawlToCsv(pages).split("\n")[0]).toBe(
      "path,status,redirectTo,canonical,noindex,title,description,h1,firstH2,words,depth,internal_links_out,jsonLdTypes,unlabelledInputs,hasMain",
    );
  });
});
