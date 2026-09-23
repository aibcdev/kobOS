import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { integration: db } }));
vi.mock("@/lib/integrations/get-integration-token", () => ({
  decryptIntegrationToken: () => ({
    accessToken: "old-token",
    refreshToken: "refresh-token",
  }),
}));
vi.mock("@/lib/crypto/tokens", () => ({
  encryptSecret: (value: string) => `encrypted:${value}`,
}));
import { googleRead, listTalkConnectors } from "./connectors";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "test-secret");
  vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32).toString("base64"));
  db.findUnique.mockResolvedValue({
    id: "integration",
    encryptedAccessToken: "encrypted-old",
    metadata: {},
  });
  db.updateMany.mockResolvedValue({ count: 1 });
  vi.stubGlobal("fetch", vi.fn());
});

describe("live connector reads", () => {
  it("does not call Google for a disconnected account", async () => {
    db.findUnique.mockResolvedValue(null);
    await expect(
      googleRead("venue", "GMAIL", "messages"),
    ).rejects.toMatchObject({ code: "disconnected" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refreshes an expired token, encrypts it, then retries the read", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: "new-token" }))
      .mockResolvedValueOnce(Response.json({ messages: [] }));
    await expect(googleRead("venue", "GMAIL", "messages")).resolves.toEqual({
      messages: [],
    });
    expect(vi.mocked(fetch).mock.calls[2][1]?.headers).toEqual({
      Authorization: "Bearer new-token",
    });
    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "integration", encryptedAccessToken: "encrypted-old" },
        data: { encryptedAccessToken: "encrypted:new-token" },
      }),
    );
  });
  it("requires reconnect when Google revokes access", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 400 }));
    await expect(
      googleRead("venue", "GMAIL", "messages"),
    ).rejects.toMatchObject({ code: "reconnect" });
    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { metadata: { talkStatus: "reconnect" } },
      }),
    );
  });
  it("does not turn a provider outage into an empty successful result", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 503 }));
    await expect(
      googleRead("venue", "GOOGLE_CALENDAR", "events"),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
  it("discards data if disconnected during the request", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ messages: [{ id: "private" }] }),
    );
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      googleRead("venue", "GMAIL", "messages"),
    ).rejects.toMatchObject({ code: "disconnected" });
  });
  it("never exposes tokens and distinguishes unverified accounts from checked ones", async () => {
    db.findMany.mockResolvedValue([
      { provider: "GMAIL", encryptedAccessToken: "secret", metadata: {} },
    ]);
    const connections = await listTalkConnectors("venue");
    expect(connections[0].state).toBe("unverified");
    expect(connections[1].state).toBe("disconnected");
    expect(JSON.stringify(connections)).not.toContain("secret");
  });
  it("shows missing deployment configuration instead of a working Connect button", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    db.findMany.mockResolvedValue([]);
    expect((await listTalkConnectors("venue"))[0].state).toBe("unavailable");
  });
});
