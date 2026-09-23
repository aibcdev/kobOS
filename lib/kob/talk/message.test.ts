import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  agent: vi.fn(),
  findConversation: vi.fn(),
  findMessage: vi.fn(),
  history: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("./access", () => ({
  talkAccess: mocks.access,
  sameOrigin: (req: Request) =>
    req.headers.get("origin") === new URL(req.url).origin,
}));
vi.mock("./agent", () => ({ runLiveTalk: mocks.agent }));
vi.mock("@/lib/ai/gemini-config", () => ({ isGeminiConfigured: () => true }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    conversation: { findFirst: mocks.findConversation, update: mocks.update },
    message: {
      findUnique: mocks.findMessage,
      findMany: mocks.history,
      create: mocks.create,
    },
    $transaction: mocks.transaction,
  },
}));
import { POST } from "@/app/api/talk/message/route";
const input = {
  restaurantId: "venue",
  conversationId: "chat",
  requestId: "988f01d2-40fb-4591-9847-1d472c3277dc",
  text: "Draft a reply to that email",
};
const request = () =>
  new Request("https://trykob.com/api/talk/message", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://trykob.com",
    },
    body: JSON.stringify(input),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue({
    ok: true,
    restaurant: { id: "venue", name: "Test", timezone: "Europe/London" },
  });
  mocks.findConversation.mockResolvedValue({ id: "chat", title: "KOB Talk" });
  mocks.findMessage.mockResolvedValue(null);
  mocks.history.mockResolvedValue([
    { role: "ASSISTANT", content: "Delivery is Friday" },
    { role: "USER", content: "Check the supplier email" },
  ]);
  mocks.agent.mockResolvedValue({
    text: "Draft — not sent: Friday works, thanks.",
    sources: [],
    activity: [],
    needsConnection: [],
  });
  mocks.create.mockResolvedValue({ id: "reply" });
  mocks.update.mockResolvedValue({ id: "chat" });
  mocks.transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
});
describe("persistent live Talk route", () => {
  it("preserves chronological context for natural follow-ups and persists the answer", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.agent.mock.calls[0][1]).toEqual([
      { role: "user", content: "Check the supplier email" },
      { role: "assistant", content: "Delivery is Friday" },
      { role: "user", content: input.text },
    ]);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          content: "Draft — not sent: Friday works, thanks.",
        }),
      }),
    );
  });
  it("cannot use a conversation belonging to another restaurant", async () => {
    mocks.findConversation.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(404);
    expect(mocks.agent).not.toHaveBeenCalled();
    expect(mocks.findConversation).toHaveBeenCalledWith({
      where: { id: "chat", restaurantId: "venue" },
    });
  });
  it("does not start a second turn while a recent reply is pending", async () => {
    mocks.history.mockResolvedValue([
      { role: "USER", content: "Check my inbox", createdAt: new Date() },
    ]);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.agent).not.toHaveBeenCalled();
  });
  it("doesn't execute duplicate submitted requests", async () => {
    mocks.findMessage.mockResolvedValue({ id: input.requestId });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.agent).not.toHaveBeenCalled();
  });
  it("persists an honest recoverable failure instead of claiming completion", async () => {
    mocks.agent.mockRejectedValue(new Error("provider timeout"));
    const response = await POST(request());
    expect((await response.json()).message.text).toContain(
      "Nothing was sent or changed",
    );
  });
  it("rejects requests before accessing data when membership fails", async () => {
    mocks.access.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.findConversation).not.toHaveBeenCalled();
  });
});
