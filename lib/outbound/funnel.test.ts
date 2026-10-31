import { describe, expect, it } from "vitest";
import { bottleneck, funnelRows, per100, type FunnelLead } from "@/lib/outbound/funnel";

const lead = (cohort: string, over: Partial<FunnelLead> = {}): FunnelLead => ({
  cohort,
  bounced: false,
  delivered: true,
  replied: false,
  auditEmail: false,
  signedUp: false,
  trial: false,
  paid: false,
  ...over,
});

describe("funnel", () => {
  it("counts each stage per cohort", () => {
    const rows = funnelRows([
      lead("A"),
      lead("A", { bounced: true, delivered: false }),
      lead("A", { replied: true, auditEmail: true, signedUp: true, trial: true }),
      lead("B", { replied: true }),
    ]);
    expect(rows).toEqual([
      { cohort: "A", sent: 3, delivered: 2, replied: 1, auditEmail: 1, signedUp: 1, trial: 1, paid: 0, bounced: 1 },
      { cohort: "B", sent: 1, delivered: 1, replied: 1, auditEmail: 0, signedUp: 0, trial: 0, paid: 0, bounced: 0 },
    ]);
  });

  it("per 100 sent, one decimal", () => {
    expect(per100(4, 400)).toBe(1);
    expect(per100(1, 3)).toBe(33.3);
    expect(per100(1, 0)).toBe(0);
  });

  it("names the stage that loses the most", () => {
    const [row] = funnelRows([...Array(100)].map((_, i) => lead("A", { replied: i < 2, auditEmail: i < 2 })));
    expect(bottleneck(row)).toEqual({ from: "delivered", to: "replied", lost: 98, kept: 0.02 });
  });
});
