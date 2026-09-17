import { describe, expect, it } from "vitest";
import { nextLeg, STAFF_RING_MS } from "@/lib/os/phone/staff-first";
import { allergenAnswer, toolAllowed } from "@/lib/os/phone/agents";
import { demoBrain, runGuestTool } from "@/lib/os/mcp-guest";
import { ownerBriefFromCalls } from "@/lib/os/phone/post-call";

describe("staff first", () => {
  it("rings staff before KOB", () => {
    expect(nextLeg({ staffAnswered: false, elapsedMs: 5_000 })).toBe("ringing_staff");
    expect(nextLeg({ staffAnswered: true, elapsedMs: 2_000 })).toBe("human");
    expect(nextLeg({ staffAnswered: false, elapsedMs: STAFF_RING_MS })).toBe("guest_kob");
  });
});

describe("guest tools", () => {
  it("blocks owner tools and unverified allergens", async () => {
    expect(toolAllowed("guest", "supplier_substitution")).toBe(false);
    expect(toolAllowed("guest", "get_restaurant_hours")).toBe(true);
    const a = allergenAnswer({ confidence: "UNVERIFIED" });
    expect(a.ok).toBe(false);
    const r = await runGuestTool("create_reservation", {}, demoBrain());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Connecting/);
  });
});

describe("post-call brief", () => {
  it("does not invent volume when empty", () => {
    expect(ownerBriefFromCalls([])).toMatch(/Coming soon/);
  });
});
