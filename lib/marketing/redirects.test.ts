import { describe, expect, it } from "vitest";
import { STATIC_PAGES } from "@/lib/seo/static-pages";
import { REDIRECTS, UNLISTED_DESTINATIONS } from "./redirects";

describe("redirect registry", () => {
  it("each source appears once", () => {
    const sources = REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("no chains: a destination is never itself redirected", () => {
    const sources = new Set(REDIRECTS.map((r) => r.source));
    expect(REDIRECTS.filter((r) => sources.has(r.destination))).toEqual([]);
  });

  it("every destination is a page in the sitemap, or a known unlisted page", () => {
    const ok = new Set<string>([...Object.keys(STATIC_PAGES), ...UNLISTED_DESTINATIONS]);
    expect(REDIRECTS.filter((r) => !ok.has(r.destination))).toEqual([]);
  });

  it("no sitemap page redirects away", () => {
    expect(REDIRECTS.filter((r) => r.source in STATIC_PAGES)).toEqual([]);
  });
});
