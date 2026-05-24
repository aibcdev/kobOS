import { describe, expect, it } from "vitest";
import { rubricFixtureEliteSignals, rubricFixtureWeakSignals } from "@/lib/audit/rubric-v2";
import { isLikelySpaShell } from "@/lib/audit/detect-spa-shell";

describe("isLikelySpaShell", () => {
  it("flags empty shells", () => {
    expect(isLikelySpaShell(rubricFixtureWeakSignals())).toBe(true);
  });

  it("does not flag elite rendered signals", () => {
    expect(isLikelySpaShell(rubricFixtureEliteSignals())).toBe(false);
  });

  it("flags Next.js shell HTML", () => {
    const signals = { ...rubricFixtureEliteSignals(), h1Count: 0, hasJsonLd: false, hasMetaDescription: false };
    const html = '<div id="__next"></div><script src="/_next/static/chunks/main.js"></script>';
    expect(isLikelySpaShell(signals, html)).toBe(true);
  });
});
