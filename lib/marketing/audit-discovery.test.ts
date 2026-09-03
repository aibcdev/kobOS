import { describe, expect, it } from "vitest";
import {
  AUDIT_DISCOVERY_QUESTIONS,
  isDiscoveryComplete,
  parseAuditDiscoveryAnswers,
  rankOpportunitiesByDiscovery,
  storeAuditDiscovery,
} from "@/lib/marketing/audit-discovery";

const valid = {
  venueSize: "2_10",
  biggestLeaks: ["reviews", "empty_tables"],
  primaryGoal: "quiet_tables",
  systems: ["square", "delivery_apps"],
  monthlySpend: "200_500",
  willingnessToPay: "50_100",
  decisionMaker: "me_solo",
  timeline: "this_month",
};

describe("audit-discovery", () => {
  it("parses complete answers", () => {
    expect(parseAuditDiscoveryAnswers(valid)).toEqual(valid);
    expect(isDiscoveryComplete(valid)).toBe(true);
  });

  it("rejects incomplete answers", () => {
    expect(parseAuditDiscoveryAnswers({ ...valid, biggestLeaks: [] })).toBeNull();
    expect(parseAuditDiscoveryAnswers({ ...valid, venueSize: "nope" })).toBeNull();
  });

  it("stores version + answeredAt", () => {
    const stored = storeAuditDiscovery(valid);
    expect(stored.version).toBe(2);
    expect(stored.answeredAt).toBeTruthy();
  });

  it("ranks opportunities by problem keywords", () => {
    const stored = storeAuditDiscovery(valid);
    const ranked = rankOpportunitiesByDiscovery(
      [
        { title: "Improve menu photos", impactEstimate: "a" },
        { title: "Reply to Google reviews faster", impactEstimate: "b" },
        { title: "Fix booking CTA", impactEstimate: "c" },
      ],
      stored,
    );
    expect(ranked[0]?.title).toMatch(/review/i);
  });

  it("has no competitor or agency wording", () => {
    const blob = JSON.stringify(AUDIT_DISCOVERY_QUESTIONS).toLowerCase();
    expect(blob).not.toMatch(/owner\.com|agency|agencies/);
  });
});