import { describe, expect, it } from "vitest";
import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";
import { displayImpact, pickBriefTasks } from "@/lib/kob/home/pick-brief-tasks";

function task(over: Partial<ChiefOfStaffTaskDto>): ChiefOfStaffTaskDto {
  return {
    id: Math.random().toString(36),
    title: "t",
    detail: "",
    category: "OPERATIONS",
    source: "AI",
    status: "PENDING",
    impactLabel: null,
    estimatedMinutes: 5,
    confidenceScore: 70,
    revenueLowGbp: null,
    revenueHighGbp: null,
    requiresIntegration: null,
    auditId: null,
    conversationId: null,
    draft: null,
    ...over,
  };
}

describe("pickBriefTasks", () => {
  it("caps at three, audit fixes first, then confidence", () => {
    const picked = pickBriefTasks([
      task({ title: "ai-high", confidenceScore: 95 }),
      task({ title: "audit-low", source: "AUDIT", confidenceScore: 80 }),
      task({ title: "audit-high", source: "AUDIT", confidenceScore: 90 }),
      task({ title: "ai-low", confidenceScore: 60 }),
    ]);
    expect(picked.map((t) => t.title)).toEqual(["audit-high", "audit-low", "ai-high"]);
  });

  it("skips tasks that need a missing connection or are already handled", () => {
    const picked = pickBriefTasks([
      task({ title: "needs-ig", requiresIntegration: "Instagram" }),
      task({ title: "approved", status: "APPROVED" }),
      task({ title: "ok" }),
    ]);
    expect(picked.map((t) => t.title)).toEqual(["ok"]);
  });
});

describe("displayImpact", () => {
  it("hides money figures but keeps plain labels", () => {
    expect(displayImpact("£400–£900/mo")).toBeNull();
    expect(displayImpact("+12 customers / mo")).toBe("+12 customers / mo");
    expect(displayImpact(null)).toBeNull();
  });
});
