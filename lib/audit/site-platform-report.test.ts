import { describe, expect, it } from "vitest";
import type { SitePlatform } from "@/lib/audit/detect-site-platform";
import { buildSitePlatformReportLine } from "@/lib/audit/site-platform-report";
import type { AuditResultPayload } from "@/lib/audit/types";

const owner: SitePlatform = {
  platform: "owner",
  label: "Owner.com",
  confidence: "high",
  score: 0.99,
  evidence: ["Footer reads \"Powered by Owner\""],
  orderingProviders: ["owner"],
};

function payload(extra: Partial<AuditResultPayload>): AuditResultPayload {
  return { scores: {}, issues: [], opportunities: [], competitors: [], ...extra } as unknown as AuditResultPayload;
}

const healthySignals = {
  fetched: true,
  fetchError: false,
  hasRestaurantSchema: true,
  hasMetaDescription: true,
};

describe("buildSitePlatformReportLine", () => {
  it("names Owner with public pricing and lists no gaps when none were measured", () => {
    const r = buildSitePlatformReportLine(
      payload({
        sitePlatform: owner,
        evidencePack: {
          urlSignals: healthySignals,
          pageSpeed: { fetchedAt: "", performanceScore: 94, lcpMs: 2700, cls: 0 },
          guestSignals: { hasOpeningHours: true },
        } as never,
      }),
    );
    expect(r?.line).toBe("Your site runs on Owner.com (public pricing $249–$499/mo).");
    expect(r?.gaps).toEqual([]);
  });

  it("only reports gaps backed by measured signals", () => {
    const r = buildSitePlatformReportLine(
      payload({
        sitePlatform: { ...owner, platform: "wix", label: "Wix" },
        evidencePack: {
          urlSignals: { ...healthySignals, hasRestaurantSchema: false },
          pageSpeed: { fetchedAt: "", performanceScore: 31, lcpMs: 19000, cls: 0 },
        } as never,
      }),
    );
    expect(r?.line).toBe("Your site runs on Wix.");
    expect(r?.gaps).toEqual(["No Restaurant schema on the homepage", "Mobile PageSpeed score 31/100"]);
  });

  it("makes no speed claim when PageSpeed failed", () => {
    const r = buildSitePlatformReportLine(
      payload({
        sitePlatform: owner,
        evidencePack: {
          urlSignals: healthySignals,
          pageSpeed: { fetchedAt: "", performanceScore: null, lcpMs: null, cls: null, error: "quota" },
        } as never,
      }),
    );
    expect(r?.gaps.some((g) => /PageSpeed/.test(g))).toBe(false);
  });

  it("makes no schema claim when the fetch failed", () => {
    const r = buildSitePlatformReportLine(
      payload({
        sitePlatform: owner,
        evidencePack: { urlSignals: { fetched: true, fetchError: true, hasRestaurantSchema: false } } as never,
      }),
    );
    expect(r?.gaps).toEqual([]);
  });

  it("stays silent below high confidence or for custom/unknown sites", () => {
    expect(buildSitePlatformReportLine(payload({ sitePlatform: { ...owner, confidence: "medium" } }))).toBeNull();
    expect(
      buildSitePlatformReportLine(payload({ sitePlatform: { ...owner, platform: "custom", label: "Custom" } })),
    ).toBeNull();
    expect(buildSitePlatformReportLine(payload({}))).toBeNull();
  });
});
