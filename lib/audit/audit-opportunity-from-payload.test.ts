import { describe, expect, it } from "vitest";
import { specificTopFixCopy } from "@/lib/audit/audit-opportunity-from-payload";
import type { AuditResultPayload } from "@/lib/audit/types";

const payload = (over: Record<string, unknown> = {}) =>
  ({
    issues: [],
    evidencePack: { googlePlace: { reviewCount: 212, photoCount: 8 } },
    restaurantScores: { reviews: 30, dataGaps: [] },
    ...over,
  }) as unknown as AuditResultPayload;

describe("specificTopFixCopy", () => {
  it("never puts a number on unanswered reviews (Google doesn't tell us)", () => {
    const out = specificTopFixCopy({ title: "Respond to Google reviews", detail: "" }, payload());
    expect(out.title).toBe("Reply to your Google reviews");
    expect(out.detail).toContain("212 Google reviews");
    expect(`${out.title} ${out.detail}`).not.toMatch(/unanswered/i);
  });

  it("only counts missing details the scan found", () => {
    const none = specificTopFixCopy({ title: "Help Google understand your restaurant", detail: "" }, payload());
    expect(none.title).not.toMatch(/\d/);
    const two = specificTopFixCopy(
      { title: "Help Google understand your restaurant", detail: "" },
      payload({ restaurantScores: { reviews: 60, dataGaps: ["GBP categories", "Listing attributes"] } }),
    );
    expect(two.title).toBe("Google is missing 2 restaurant details");
  });
});
