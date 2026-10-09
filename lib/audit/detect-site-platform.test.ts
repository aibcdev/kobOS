import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectSitePlatform, isBotChallengePage } from "@/lib/audit/detect-site-platform";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__/site-platform", `${name}.html`), "utf8");

const cases: Array<[string, string, string]> = [
  ["owner-doodahdiner", "https://doodahdiner.com/", "owner"],
  ["owner-talkintacos", "https://talkintacos.net/", "owner"],
  ["owner-gyroconcept", "https://gyroconcept.com/", "owner"],
  ["toast-legacyrolls", "https://legacyrolls.toast.site/", "toast"],
  ["square-gaetanos", "https://my-site-109335.square.site/", "square"],
  ["bentobox-tavernetta", "https://www.tavernettadenver.com/", "bentobox"],
  ["wix-mattengas", "https://www.mattengaspizzeria.com/", "wix"],
  ["squarespace-joespizza", "https://www.joespizzanyc.com/", "squarespace"],
  ["webflow-hillcrust", "https://hillcrustpizza.com/", "webflow"],
  ["wordpress-rigatonys", "https://rigatonys.com/", "wordpress"],
];

describe("detectSitePlatform", () => {
  it.each(cases)("%s → %s", (name, url, expected) => {
    const result = detectSitePlatform({ html: fixture(name), finalUrl: url });
    expect(result.platform).toBe(expected);
    expect(result.confidence).toBe("high");
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("never labels a non-Owner site as Owner", () => {
    for (const [name, url, expected] of cases) {
      if (expected === "owner") continue;
      expect(detectSitePlatform({ html: fixture(name), finalUrl: url }).platform).not.toBe("owner");
    }
  });

  it("treats a hosted ordering page with no builder fingerprint as custom, but records the ordering provider", () => {
    const result = detectSitePlatform({
      html: fixture("custom-chownow-goicuon"),
      finalUrl: "https://order.chownow.com/order/37990/locations/57892",
    });
    expect(result.platform).toBe("custom");
    expect(result.orderingProviders).toContain("chownow");
  });

  it("reports unknown, not custom, when the fetch hit a Cloudflare challenge", () => {
    const html = fixture("challenge-cloudflare");
    expect(isBotChallengePage(html)).toBe(true);
    const result = detectSitePlatform({ html, finalUrl: "https://doodahdiner.com/" });
    expect(result.platform).toBe("unknown");
    expect(result.evidence[0]).toMatch(/challenge/i);
  });

  it("identifies Owner from rendered network paths and cookies alone", () => {
    const result = detectSitePlatform({
      html: "<html><body>Menu</body></html>",
      finalUrl: "https://example-diner.com/",
      networkPaths: ["/api/olympus/carts/v3/abc", "/universal-log-exposure/"],
      cookieNames: ["owner-stable-id"],
    });
    expect(result.platform).toBe("owner");
    expect(result.confidence).toBe("high");
    expect(result.orderingProviders).toContain("owner");
  });

  it("returns unknown with no captured HTML", () => {
    expect(detectSitePlatform({ html: null, finalUrl: "https://x.com/" }).platform).toBe("unknown");
  });
});
