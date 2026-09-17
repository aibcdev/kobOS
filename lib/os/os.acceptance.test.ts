import { describe, expect, it } from "vitest";
import { createInMemoryHoursAdapter } from "@/lib/os/adapters/hours-memory";
import { syncHoursEverywhere } from "@/lib/os/workflows/hours";
import { applyTemporaryClosure, parseTemporaryClosure } from "@/lib/os/voice/closure";
import {
  coffeeSwitchAllowed,
  parseNeverDiscountFriday,
  parseNeverSwitchCoffee,
} from "@/lib/os/reputation-memory";
import { parseInvoiceLine } from "@/lib/os/invoice";
import { usableUnitCost, landedCost, isEquivalent, verifiedSavings } from "@/lib/os/cost";
import { prepQty } from "@/lib/os/demand";
import {
  countsAsMeasured,
  wasteClaimAllowed,
  wasteEventCost,
  wasteReductionPct,
} from "@/lib/os/waste";
import { reliabilityScore, autonomyFromReliability } from "@/lib/os/reliability";
import { HOURS_LABEL, POS_GUEST_LABEL, WASTE_EYE_LABEL } from "@/lib/os/readiness";

describe("acceptance 43 hours", () => {
  it("updates Google to website canonical and verifies read-back", async () => {
    const google = createInMemoryHoursAdapter({ open: "09:00", close: "17:00" }, { name: "google" });
    const website = createInMemoryHoursAdapter({ open: "09:00", close: "16:00" }, { name: "website" });
    const out = await syncHoursEverywhere({
      google: google.snapshot(),
      website: website.snapshot(),
      canonical: "website",
      permissionMode: "ASK",
      role: "OWNER",
      reliability: 0.96,
      approved: true,
      adapters: { google, website },
    });
    expect(google.snapshot().close).toBe("16:00");
    expect(out.results.find((r) => r.channel === "google")?.status).toBe("VERIFIED");
    expect(out.ownerMessage).toContain("16:00");
  });
});

describe("acceptance 46 voice closure", () => {
  it("does not say Done when reservations fail", async () => {
    const intent = parseTemporaryClosure("KOB, we're shut Monday.", new Date("2026-09-17T12:00:00Z"));
    expect(intent?.intent).toBe("TEMPORARY_CLOSURE");
    const google = createInMemoryHoursAdapter({ open: "09:00", close: "16:00" }, { name: "Google" });
    const website = createInMemoryHoursAdapter({ open: "09:00", close: "16:00" }, { name: "the website" });
    const reservations = createInMemoryHoursAdapter(
      { open: "09:00", close: "16:00" },
      { name: "reservations", failExecute: true },
    );
    const asked = await applyTemporaryClosure({
      date: intent!.entities.date,
      locationCount: 1,
      permissionMode: "ASK",
      role: "OWNER",
      reliability: 0.95,
      adapters: { Google: google, website, reservations },
    });
    expect(asked.ask).toContain("Apply all");
    const done = await applyTemporaryClosure({
      date: intent!.entities.date,
      locationCount: 1,
      permissionMode: "ASK",
      role: "OWNER",
      reliability: 0.95,
      approved: true,
      adapters: { Google: google, website, reservations },
    });
    expect(done.message.toLowerCase()).not.toBe("done.");
    expect(done.message).toMatch(/couldn't update reservations/i);
    expect(done.message).toMatch(/Google/i);
  });
});

describe("acceptance 47 memory", () => {
  it("blocks coffee substitution after confirmed rule", () => {
    const rule = parseNeverSwitchCoffee("Don't ever switch our coffee supplier because of price.");
    expect(rule).toBeTruthy();
    expect(coffeeSwitchAllowed([rule!])).toBe(false);
    expect(parseNeverDiscountFriday("Never discount Friday.")?.actionJson.prohibited).toBe(true);
  });
});

describe("acceptance 44 waste", () => {
  it("costs 1.42kg focaccia at £2.80/kg and will not claim reduction from estimates", () => {
    expect(wasteEventCost(1.42, 2.8)).toBeCloseTo(3.976, 3);
    expect(countsAsMeasured("ESTIMATE")).toBe(false);
    expect(
      wasteClaimAllowed({
        method: "ESTIMATE",
        baselineDays: 28,
        currentDays: 28,
        methodsComparable: true,
        coversOk: true,
      }),
    ).toBe(false);
    expect(wasteReductionPct(2.1 / 100, 0.8 / 100)).toBeGreaterThan(0);
  });
});

describe("acceptance 45 supplier cups", () => {
  it("compares landed unit cost and requires equivalence", () => {
    const current = landedCost({
      productCost: 72,
      deliveryCharge: 5,
      surcharges: 0,
      expectedWasteCost: 0,
      rebates: 0,
    });
    const candidate = landedCost({
      productCost: 61,
      deliveryCharge: 7,
      surcharges: 0,
      expectedWasteCost: 0,
      rebates: 0,
    });
    expect(current / 1000).toBeCloseTo(0.077, 3);
    expect(candidate / 1000).toBeCloseTo(0.068, 3);
    const monthly = (0.077 - 0.068) * 4000;
    expect(monthly).toBeCloseTo(36, 0);
    expect(
      isEquivalent({
        categoryMatch: true,
        specCompatible: true,
        allergyCompatible: true,
        qualityOk: true,
        packagingOk: true,
        deliveryOk: true,
      }),
    ).toBe(true);
    expect(verifiedSavings(0.077, 0.068, 4000, 0)).toBeCloseTo(36, 0);
  });
});

describe("formulas", () => {
  it("prep qty and chicken usable cost", () => {
    expect(prepQty({ forecastDemand: 30, portionQty: 0.18, safetyBufferPct: 0.05, yieldPct: 0.92 })).toBeCloseTo(
      6.16,
      1,
    );
    expect(usableUnitCost(48, 10, 0.82)).toBeCloseTo(5.85, 2);
    expect(usableUnitCost(45, 9, 0.9)).toBeCloseTo(5.56, 2);
  });

  it("invoice pack line", () => {
    const line = parseInvoiceLine("TOMATO PLUM ITALIAN 6X2.5KG", 2, 65.4);
    expect(line.total_base_quantity).toBe(30);
    expect(line.unit_price).toBeCloseTo(2.18, 2);
  });

  it("reliability bands", () => {
    const s = reliabilityScore({ d: 0.98, e: 0.96, v: 0.99, c: 0.93, f: 0.97, u: 0.95 });
    expect(s).toBeCloseTo(0.966, 2);
    expect(autonomyFromReliability(s)).toBe("limited_autopilot");
    expect(HOURS_LABEL).toBe("LIVE");
    expect(WASTE_EYE_LABEL).toBe("COMING_SOON");
    expect(POS_GUEST_LABEL).toBe("COMING_SOON");
  });
});
