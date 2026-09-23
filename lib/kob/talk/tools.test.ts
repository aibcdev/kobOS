import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
const read = vi.hoisted(() => vi.fn());
vi.mock("./connectors", async (original) => ({
  ...(await original<typeof import("./connectors")>()),
  googleRead: read,
}));
import { ConnectorError } from "./connectors";
import { buildTalkTools, plainEmail, validCalendarRange } from "./tools";

beforeEach(() => vi.resetAllMocks());
describe("Talk evidence and capability boundaries", () => {
  it("extracts plain text and never returns HTML markup as message content", () => {
    expect(
      plainEmail({
        mimeType: "multipart/alternative",
        parts: [
          {
            mimeType: "text/html",
            body: {
              data: Buffer.from("<script>bad</script>").toString("base64url"),
            },
          },
          {
            mimeType: "text/plain",
            body: {
              data: Buffer.from("Delivery on Friday").toString("base64url"),
            },
          },
        ],
      }),
    ).toBe("Delivery on Friday");
  });
  it("rejects reversed and excessive calendar ranges", () => {
    expect(
      validCalendarRange("2026-09-22T00:00:00Z", "2026-09-23T00:00:00Z"),
    ).toBe(true);
    expect(
      validCalendarRange("2026-09-22T00:00:00Z", "2026-09-21T00:00:00Z"),
    ).toBe(false);
    expect(
      validCalendarRange("2026-09-22T00:00:00Z", "2027-01-01T00:00:00Z"),
    ).toBe(false);
  });
  it("shows a connector action when a read requires authorization", async () => {
    read.mockRejectedValue(
      new ConnectorError("GMAIL", "disconnected", "Connect Gmail"),
    );
    const context = buildTalkTools("venue");
    const result = await context.tools.search_email.execute!(
      { query: "newer_than:7d" },
      { toolCallId: "test", messages: [] },
    );
    expect(result).toEqual({ ok: false, error: "Connect Gmail" });
    expect([...context.needsConnection]).toEqual(["GMAIL"]);
    expect(context.sources).toEqual([]);
  });
  it("exposes real email source links and preserves pagination limits", async () => {
    read
      .mockResolvedValueOnce({
        messages: [{ id: "abc123" }],
        nextPageToken: "more",
      })
      .mockResolvedValueOnce({
        snippet: "Friday delivery",
        payload: { headers: [{ name: "subject", value: "Supplier update" }] },
      });
    const context = buildTalkTools("venue");
    const result = await context.tools.search_email.execute!(
      { query: "supplier" },
      { toolCallId: "test", messages: [] },
    );
    expect(result).toMatchObject({
      ok: true,
      data: { moreAvailable: true, messages: [{ subject: "Supplier update" }] },
    });
    expect(context.sources[0].url).toBe(
      "https://mail.google.com/mail/u/0/#all/abc123",
    );
  });
  it("doesn't pretend an empty calendar is a disconnected calendar", async () => {
    read.mockResolvedValue({ items: [], timeZone: "Europe/London" });
    const context = buildTalkTools("venue");
    const result = await context.tools.calendar_events.execute!(
      { start: "2026-09-22T00:00:00Z", end: "2026-09-23T00:00:00Z" },
      { toolCallId: "test", messages: [] },
    );
    expect(result).toMatchObject({ ok: true, data: { events: [] } });
    expect(context.needsConnection.size).toBe(0);
    expect(context.sources).toHaveLength(1);
  });
  it("provides no write or arbitrary HTTP tools", () => {
    expect(Object.keys(buildTalkTools("venue").tools)).toEqual([
      "connections",
      "search_email",
      "read_email",
      "calendar_events",
    ]);
  });
});
