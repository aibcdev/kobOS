import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  agent: vi.fn(),
  facts: vi.fn(),
  create: vi.fn(),
}));
vi.mock("./access", () => ({
  talkAccess: async () => ({ ok: true, userId: "owner", restaurant: { id: "venue", name: "Godfather", timezone: "Africa/Johannesburg" } }),
  sameOrigin: () => true,
}));
vi.mock("./agent", () => ({ runLiveTalk: mocks.agent }));
vi.mock("./fallback", () => ({ answerFromFacts: mocks.facts }));
vi.mock("@/lib/ai/gemini-config", () => ({ isGeminiConfigured: () => false }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    conversation: { findFirst: async () => ({ id: "chat" }), update: async () => ({}) },
    message: { findUnique: async () => null, findMany: async () => [], create: mocks.create },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));
import { randomUUID } from "node:crypto";
import { POST } from "@/app/api/talk/message/route";

const ask = (text: string) =>
  POST(
    new Request("https://trykob.com/api/talk/message", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://trykob.com" },
      body: JSON.stringify({ restaurantId: "venue", conversationId: "chat", requestId: randomUUID(), text }),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ id: "reply" });
  mocks.facts.mockResolvedValue({ text: "3 reviews this week, 2 still need a reply.", activity: [], intent: "reviews_week" });
});
afterEach(() => vi.useRealTimers());

describe("Talk without the language service", () => {
  it("answers from the restaurant's data instead of returning 503", async () => {
    const res = await ask("What should I do about my reviews this week?");
    expect(res.status).toBe(200);
    expect((await res.json()).message.text).toBe("3 reviews this week, 2 still need a reply.");
    expect(mocks.agent).not.toHaveBeenCalled();
    expect(mocks.facts).toHaveBeenCalledWith("venue", "owner", "What should I do about my reviews this week?");
  });

  it("20 questions 7 seconds apart all get answers (the rate limit only stops bursts)", async () => {
    // Start an hour ahead on a minute boundary, so earlier calls in this file can't share a limiter window.
    const start = (Math.floor(Date.now() / 60_000) + 60) * 60_000;
    vi.useFakeTimers({ toFake: ["Date"] });
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      vi.setSystemTime(start + i * 7_000);
      statuses.push((await ask(`Question ${i + 1}`)).status);
    }
    expect(statuses).toEqual(Array(20).fill(200));
  });
});
