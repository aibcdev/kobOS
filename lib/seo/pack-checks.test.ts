import { describe, expect, it } from "vitest";
import {
  competingQueries,
  contentChecks,
  indexingChecks,
  landingChecks,
  linkChecks,
  notIndexedChecks,
  overlapChecks,
  sortFindings,
  strikingDistance,
  titleChecks,
} from "./pack-checks";
import type { PageFacts } from "./site-crawl";

const page = (path: string, over: Partial<PageFacts> = {}): PageFacts => ({
  url: `https://trykob.com${path}`,
  path,
  status: 200,
  redirectTo: null,
  canonical: `https://trykob.com${path === "/" ? "" : path}`,
  noindex: false,
  title: `${path} title for KOB pages`,
  description: `Description for ${path}`,
  h1: [`Heading ${path}`],
  firstH2: "",
  words: 800,
  links: [],
  jsonLdTypes: [],
  unlabelledInputs: 0,
  hasMain: true,
  depth: 1,
  ...over,
});

const row = (query: string, path: string, impressions: number, position: number) => ({ query, page: "", path, clicks: 0, impressions, ctr: 0, position });

describe("indexingChecks", () => {
  it("flags redirects, errors and noindex in the sitemap, bad canonicals, and indexable pages left out", () => {
    const pages = [
      page("/"),
      page("/audit", { status: 308, redirectTo: "/scan" }),
      page("/gone", { status: 404 }),
      page("/scan", { noindex: true }),
      page("/go/audit", { canonical: "https://trykob.com/audit" }),
      page("/about"),
      page("/audit/farmhouse"),
    ];
    const out = indexingChecks(pages, ["/", "/audit", "/gone", "/scan", "/go/audit"]);
    expect(out.map((f) => [f.path, f.severity])).toEqual([
      ["/audit", "high"],
      ["/gone", "high"],
      ["/scan", "high"],
      ["/go/audit", "high"],
      ["/about", "low"],
    ]);
    expect(out[3].detail).toContain("returns 308 → /scan");
  });
});

describe("titleChecks", () => {
  it("finds missing, long, duplicate titles and H1 problems on indexable pages only", () => {
    const out = titleChecks([
      page("/a", { title: "" }),
      page("/b", { title: "x".repeat(70) }),
      page("/c", { title: "Same title here please", description: "Same" }),
      page("/d", { title: "Same title here please", description: "Same" }),
      page("/e", { h1: [] }),
      page("/f", { h1: ["One", "Two"] }),
      page("/g", { title: "", noindex: true }),
    ]);
    const has = (path: string, check: string, text: string) => out.some((f) => f.path === path && f.check === check && f.detail.includes(text));
    expect(has("/a", "titles", "No <title>")).toBe(true);
    expect(has("/b", "titles", "70 characters")).toBe(true);
    expect(has("/c", "titles", "Same title as /d")).toBe(true);
    expect(has("/d", "descriptions", "Same description as /c")).toBe(true);
    expect(has("/e", "titles", "No H1")).toBe(true);
    expect(has("/f", "titles", "2 H1s")).toBe(true);
    expect(out.some((f) => f.path === "/g")).toBe(false);
  });
});

describe("contentChecks", () => {
  it("flags thin pages, banned words, unlabelled fields and missing <main>", () => {
    const out = contentChecks([page("/thin", { words: 120 }), page("/ai", { title: "The best AI manager" }), page("/form", { unlabelledInputs: 2, hasMain: false })]);
    expect(out.map((f) => [f.path, f.check])).toEqual([
      ["/thin", "thin"],
      ["/ai", "wording"],
      ["/form", "semantics"],
      ["/form", "semantics"],
    ]);
  });
});

describe("linkChecks", () => {
  it("lists pages with fewer than two links in, suggesting similar pages to link from", () => {
    const pages = [
      page("/", { links: ["/pricing", "/resources/review-tools"] }),
      page("/pricing", { links: ["/resources/review-tools"] }),
      page("/resources/review-tools", { title: "Best review tools for restaurants" }),
      page("/resources/review-replies", { title: "Best review reply tools for restaurants" }),
    ];
    const out = linkChecks(pages, new Map([["/resources/review-replies", 40]]));
    expect(out).toHaveLength(2);
    expect(out.find((f) => f.path === "/resources/review-replies")).toMatchObject({ severity: "high" });
    expect(out.find((f) => f.path === "/resources/review-replies")!.detail).toContain("Link from: /resources/review-tools");
  });
});

describe("overlapChecks", () => {
  it("pairs pages whose titles nearly match", () => {
    const out = overlapChecks([
      page("/x", { title: "Best restaurant marketing software for independents" }),
      page("/y", { title: "Best restaurant marketing software for UK independents" }),
      page("/z", { title: "Fix wrong Google hours" }),
    ]);
    expect(out.map((f) => f.path)).toEqual(["/x"]);
    expect(out[0].detail).toContain("/y");
  });

  it("ignores the site-wide title suffix", () => {
    const suffix = " | KOB — The Restaurant Manager for Owners";
    const pages = ["Pricing", "Product", "About us", "Free scan", "Data policy"].map((t, i) => page(`/p${i}`, { title: `${t}${suffix}`, h1: [t] }));
    expect(overlapChecks(pages)).toEqual([]);
  });
});

describe("Search Console checks", () => {
  const rows = [
    row("owner.com alternatives", "/resources/owner-com-alternatives-compared", 90, 8),
    row("owner.com alternatives", "/resources/kob-vs-owner-com-which-is-better", 30, 14),
    row("restaurant review replies", "/product", 300, 6),
    row("kob", "/", 500, 1),
  ];

  it("finds queries split across pages", () => {
    const out = competingQueries(rows);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ path: "/resources/owner-com-alternatives-compared", severity: "high" });
  });

  it("finds striking-distance queries by page", () => {
    const out = strikingDistance(rows);
    expect(out.map((f) => [f.path, f.severity])).toEqual([
      ["/resources/owner-com-alternatives-compared", "medium"],
      ["/resources/kob-vs-owner-com-which-is-better", "medium"],
      ["/product", "high"],
    ]);
  });

  it("explains not-indexed URLs from the crawl", () => {
    const out = notIndexedChecks(
      [
        { path: "/resources/x", reason: "Crawled - currently not indexed" },
        { path: "/scan", reason: "Excluded by noindex tag" },
        { path: "/nowhere", reason: "Discovered - currently not indexed" },
      ],
      [page("/resources/x", { words: 250 }), page("/scan", { noindex: true })],
    );
    expect(out.map((f) => f.severity)).toEqual(["high", "low", "low"]);
    expect(out[2].detail).toContain("no internal links");
  });
});

describe("landingChecks and sorting", () => {
  it("flags busy landing pages with no audits, and sorts high first", () => {
    const out = landingChecks([
      { path: "/", entries: 50, audits: 2 },
      { path: "/pricing", entries: 30, audits: 0 },
      { path: "/about", entries: 5, audits: 0 },
    ]);
    expect(out.map((f) => f.path)).toEqual(["/pricing"]);
    const sorted = sortFindings([...out, { check: "titles", severity: "high", path: "/a", detail: "" }]);
    expect(sorted[0].severity).toBe("high");
  });
});
