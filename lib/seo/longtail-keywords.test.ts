import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { bannedWordsIn } from "@/lib/copy/banned-words";
import { parseCsv } from "./gsc-shortlist";

/** Live pages we don't send social traffic to: ordering and delivery aren't KOB's product. */
const NOT_TARGETS = ["/features/online-ordering", "/features/delivery"];

const [header, ...rows] = parseCsv(readFileSync(join(process.cwd(), "seo/keywords/keywords.csv"), "utf8"));
const col = (name: string) => header.indexOf(name);
const livePaths = new Set(sitemap().map((e) => new URL(e.url).pathname.replace(/(.)\/$/, "$1")));

describe("seo/keywords/keywords.csv", () => {
  it("has 30 distinct phrases of 3 to 8 words", () => {
    const phrases = rows.map((r) => r[col("phrase")]);
    expect(phrases).toHaveLength(30);
    expect(new Set(phrases.map((p) => p.toLowerCase())).size).toBe(30);
    for (const p of phrases) expect(p.split(/\s+/).length, p).toBeGreaterThanOrEqual(3);
    for (const p of phrases) expect(p.split(/\s+/).length, p).toBeLessThanOrEqual(8);
  });

  it("only targets pages in the sitemap, never ordering or delivery", () => {
    for (const r of rows) {
      const page = r[col("target_page")];
      expect(livePaths.has(page), page).toBe(true);
      expect(NOT_TARGETS).not.toContain(page);
    }
  });

  it("keeps the brief's banned words out of the phrases", () => {
    for (const r of rows) {
      const phrase = r[col("phrase")];
      expect(bannedWordsIn(phrase), phrase).toEqual([]);
      expect(phrase).not.toMatch(/\b(llm|gpt|pos|phone)\b/i);
    }
  });

  it("uses known intents", () => {
    for (const r of rows) expect(["informational", "commercial", "comparison"]).toContain(r[col("intent")]);
  });
});
