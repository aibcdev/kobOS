import { describe, expect, it } from "vitest";
import { positionWeight, rowsFromCsv, shortlist, similarity, toCsv } from "./gsc-shortlist";

const LONG = "how do i change my restaurant hours on google for christmas";
const LONG_DUP = "how do i change restaurant hours on google for christmas";

describe("rowsFromCsv", () => {
  it("reads the Search Console Queries tab, including quoted queries and % CTR", () => {
    const csv = `﻿Top queries,Clicks,Impressions,CTR,Position\n"${LONG}, uk",1,140,0.71%,8.2\nkob,30,90,33.3%,1.1\n`;
    expect(rowsFromCsv(csv)).toEqual([
      { query: `${LONG}, uk`, page: "", clicks: 1, impressions: 140, ctr: 0.0071, position: 8.2 },
      { query: "kob", page: "", clicks: 30, impressions: 90, ctr: 0.333, position: 1.1 },
    ]);
  });

  it("reads a page column when the export has one, and ignores the Pages tab", () => {
    const withPage = `query,page,clicks,impressions,ctr,position\n${LONG},https://trykob.com/pricing,0,50,0,12\n`;
    expect(rowsFromCsv(withPage)[0].page).toBe("https://trykob.com/pricing");
    expect(rowsFromCsv("Top pages,Clicks,Impressions,CTR,Position\nhttps://trykob.com/,1,2,50%,3\n")).toEqual([]);
  });
});

describe("shortlist", () => {
  const row = (query: string, impressions: number, ctr: number, position: number, page = "") => ({
    query,
    page,
    clicks: 0,
    impressions,
    ctr,
    position,
  });

  it("keeps 8+ word queries with enough impressions and a low click rate", () => {
    const out = shortlist([
      row(LONG, 100, 0.01, 5),
      row("restaurant hours google", 500, 0, 3),
      row(`${LONG} please`, 10, 0, 3),
      row(`${LONG} today`, 100, 0.05, 3),
    ]);
    expect(out.map((r) => r.query)).toEqual([LONG]);
    expect(out[0].score).toBeCloseTo(99);
  });

  it("weights by position and groups near-duplicates under the top query", () => {
    expect([positionWeight(10), positionWeight(11), positionWeight(21)]).toEqual([1, 0.7, 0.4]);
    expect(similarity(LONG, LONG_DUP)).toBeGreaterThanOrEqual(0.8);
    const out = shortlist([row(LONG_DUP, 60, 0, 4), row(LONG, 100, 0, 15), row("what time does a pub kitchen close on sunday in the uk", 40, 0, 2)]);
    expect(out.map((r) => [r.query, r.clusterId])).toEqual([
      [LONG, 1],
      [LONG_DUP, 1],
      ["what time does a pub kitchen close on sunday in the uk", 2],
    ]);
  });

  it("prefers the row that names a page when the same query appears twice", () => {
    const out = shortlist([row(LONG, 100, 0, 5), row(LONG, 80, 0, 5, "https://trykob.com/product")]);
    expect(out).toHaveLength(1);
    expect(out[0].page).toBe("https://trykob.com/product");
    expect(toCsv(out).split("\n")[1]).toBe(`${LONG},https://trykob.com/product,80,0,0.0000,5.0,80.0,1`);
  });
});
