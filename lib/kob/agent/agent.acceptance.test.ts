import { describe, expect, it } from "vitest";
import { classifyIntentSafe, requiresRestaurantGrounding, isActionRequest } from "@/lib/kob/agent/intent";
import { runKobTurn } from "@/lib/kob/agent/run";
import { DEMO_RESTAURANTS, DEFAULT_AUTONOMY } from "@/lib/kob/demo";
import { EMPTY_RULES } from "@/lib/kob/house-rules";
import { EMPTY_TOOLS } from "@/lib/kob/integrations";
import { findingsFor, reviewsFor } from "@/lib/kob/demo-runtime";

const restaurant = DEMO_RESTAURANTS[0]!;

function base(connected: Partial<Record<string, boolean>> = {}) {
  return {
    restaurant,
    connected: { ...EMPTY_TOOLS, google: true, website: true, ...connected },
    autonomy: DEFAULT_AUTONOMY,
    houseRules: EMPTY_RULES,
    memory: [] as [],
    findings: findingsFor(restaurant),
    reviews: reviewsFor(restaurant),
  };
}

describe("KOB agent grounding", () => {
  it("classifies operational questions as restaurant, not general", () => {
    expect(classifyIntentSafe("Did any supplier prices rise?")).toBe("RESTAURANT_QUESTION");
    expect(requiresRestaurantGrounding("RESTAURANT_QUESTION", "Did any supplier prices rise?")).toBe(
      true,
    );
  });

  it("classifies close Monday as action", () => {
    expect(classifyIntentSafe("We're closed Monday.")).toBe("RESTAURANT_ACTION");
    expect(isActionRequest("RESTAURANT_ACTION", "We're closed Monday.")).toBe(true);
  });

  it("what needs me uses findings — not generic tips", async () => {
    const turn = await runKobTurn({ text: "What needs my attention?", ...base() });
    expect(turn.grounded).toBe(true);
    expect(turn.type).toMatch(/FINDING|ANSWER/);
    expect(turn.message.toLowerCase()).not.toMatch(/consider|best practices|generally speaking/);
    expect(turn.toolCalls.some((t) => t.name === "get_attention")).toBe(true);
  });

  it("supplier prices without invoices asks to connect — no inflation essay", async () => {
    const turn = await runKobTurn({
      text: "Did any supplier prices rise?",
      ...base({ accounting: false, email: false }),
    });
    expect(turn.type).toBe("NEEDS_CONNECTION");
    expect(turn.message.toLowerCase()).toMatch(/invoice/);
    expect(turn.message.toLowerCase()).not.toMatch(/fluctuat|strategies for controlling/);
    expect(turn.meta?.genericFallbackBlocked).toBe(true);
  });

  it("supplier prices with accounting returns DEMO cards labelled", async () => {
    const turn = await runKobTurn({
      text: "Anything cost me more this week?",
      ...base({ accounting: true }),
    });
    expect(turn.grounded).toBe(true);
    expect(turn.cards?.length).toBeGreaterThan(0);
    expect(turn.message).toMatch(/DEMO|example/i);
  });

  it("closed Monday proposes action on connected systems", async () => {
    const turn = await runKobTurn({ text: "We're closed Monday.", ...base() });
    expect(turn.type).toBe("ACTION_PROPOSAL");
    expect(turn.message).toMatch(/Google|Website/);
    expect(turn.actions?.some((a) => a.kind === "approve")).toBe(true);
  });

  it("prep without POS refuses invented quantities", async () => {
    const turn = await runKobTurn({ text: "What should we prep tomorrow?", ...base({ pos: false }) });
    expect(turn.type).toBe("NEEDS_CONNECTION");
    expect(turn.message).toMatch(/POS|sales/i);
    expect(turn.message).not.toMatch(/\d+\s*kg/);
  });

  it("waste without Waste Eye never invents kg", async () => {
    const turn = await runKobTurn({ text: "How much did we waste yesterday?", ...base() });
    expect(turn.message).toMatch(/Waste Eye|measured/i);
    expect(turn.message).not.toMatch(/\d+\.\d+\s*kg/);
  });

  it("never change coffee creates rule candidate", async () => {
    const turn = await runKobTurn({ text: "Never change our coffee supplier.", ...base() });
    expect(turn.type).toBe("RULE");
    expect(turn.cards?.[0]?.body).toMatch(/NEVER/);
  });

  it("reply to reviews loads reviews or asks for Google", async () => {
    const off = await runKobTurn({
      text: "Reply to today's reviews.",
      ...base({ google: false }),
    });
    expect(off.type).toBe("NEEDS_CONNECTION");

    const on = await runKobTurn({ text: "Reply to today's reviews.", ...base() });
    expect(on.type).toBe("ACTION_PROPOSAL");
    expect(on.toolCalls.some((t) => t.name === "get_recent_reviews")).toBe(true);
  });
});
