import { describe, expect, it } from "vitest";
import { isReadyToPublish, runPrePublishChecks } from "@/lib/seo/validate-ai-era-content";

const sampleBrief = {
  keyword: "best brunch Bristol",
  coreQuestion: "Where is the best brunch in Bristol?",
  aeoBlock:
    "The best brunch in Bristol combines locally sourced ingredients, relaxed weekend service, and menus that work for both quick coffees and long table bookings. Independent spots near the Harbourside and Clifton tend to score highest for consistency, portion value, and dietary options. Look for venues that take bookings before 11am on Saturdays, publish seasonal menus online, and maintain strong recent Google reviews from locals rather than one-off tourists. A strong brunch restaurant answers three needs: quality coffee, flexible plates for groups, and clear pricing on the website before you arrive.",
  h2Map: [
    "What time is brunch served in Bristol?",
    "Is brunch booking required?",
    "Best brunch for families in Bristol?",
  ],
  reader: "Couple planning a Saturday brunch in Bristol",
  edge: "First-hand comparison of 12 independent Bristol brunch spots by neighbourhood",
  edgeType: "original_data" as const,
  cta: "Book a table online",
  eeatSignal: "Based on 340 weekend covers tracked across Q1 2026",
};

describe("runPrePublishChecks", () => {
  it("passes a complete brief", () => {
    const checks = runPrePublishChecks(sampleBrief);
    expect(isReadyToPublish(checks)).toBe(true);
  });
});
