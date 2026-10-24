import { describe, expect, it } from "vitest";
import { ADDONS, ADDONS_ON_SALE, coreEntitlements, entitlementsFor, hasAddon } from "@/lib/billing/entitlements";

describe("entitlements", () => {
  it("core only while no add-on is on sale", () => {
    expect(ADDONS_ON_SALE).toEqual([]);
    const e = entitlementsFor(["PHONE_HOST", "DIRECT_ORDERING"]);
    expect(e).toEqual(coreEntitlements());
    for (const a of ADDONS) expect(hasAddon(e, a)).toBe(false);
  });

  it("features without an add-on are always allowed", () => {
    expect(hasAddon(coreEntitlements(), null)).toBe(true);
  });
});
