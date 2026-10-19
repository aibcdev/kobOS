import { describe, expect, it } from "vitest";
import { ConnectorError } from "@/lib/connectors/errors";
import { incrementalPage, providerJson, readCursor, utcToZoned, zonedToUtc } from "@/lib/connectors/shared";
import { fakeFetch } from "@/tests/helpers/fake-fetch";

describe("connector shared helpers", () => {
  it("maps provider HTTP failures onto ConnectorError codes", async () => {
    const { fetch } = fakeFetch([
      { match: /rate/, reply: { status: 429, headers: { "Retry-After": "7" } } },
      { match: /auth/, reply: { status: 401, json: { secret: "do-not-log" } } },
      { match: /missing/, reply: { status: 404 } },
      { match: /bad/, reply: { status: 422 } },
      { match: /down/, reply: { status: 503 } },
    ]);
    const err = (p: string) => providerJson<never>({ fetch }, "Acme", `https://api.acme.test/${p}`).catch((e: ConnectorError) => e);
    expect(await err("rate")).toMatchObject({ code: "RATE_LIMIT", retryAfterMs: 7000 });
    const auth = await err("auth");
    expect(auth).toMatchObject({ code: "AUTH", status: 401 });
    expect(auth.message).not.toContain("do-not-log");
    expect(await err("missing")).toMatchObject({ code: "NOT_FOUND" });
    expect(await err("bad")).toMatchObject({ code: "VALIDATION" });
    expect(await err("down")).toMatchObject({ code: "PROVIDER", retriable: true });
    const offline = await providerJson({ fetch: (async () => { throw new TypeError("fetch failed"); }) as typeof fetch }, "Acme", "https://x.test/").catch((e) => e);
    expect(offline).toMatchObject({ code: "NETWORK" });
  });

  it("incremental cursors keep the watermark across pages and advance it when done", () => {
    const now = new Date("2026-10-19T00:00:00Z");
    const first = readCursor(null, 90, now);
    expect(first.since).toBe("2026-07-21T00:00:00.000Z");
    const mid = incrementalPage(first, 100, "P2", "2026-08-01T00:00:00Z");
    expect(mid.done).toBe(false);
    const c2 = readCursor(mid.nextCursor, 90, now);
    expect(c2).toEqual({ since: first.since, page: "P2", maxSeen: "2026-08-01T00:00:00Z" });
    const end = incrementalPage(c2, 5, null, "2026-07-30T00:00:00Z");
    expect(end).toEqual({ rows: 5, done: true, nextCursor: JSON.stringify({ since: "2026-08-01T00:00:00Z" }) });
    expect(incrementalPage({ since: "S" }, 0, null, null).nextCursor).toBe(JSON.stringify({ since: "S" }));
    expect(readCursor("2026-09-01T00:00:00Z", 90, now)).toEqual({ since: "2026-09-01T00:00:00Z" });
  });

  it("converts wall-clock times across DST", () => {
    expect(zonedToUtc("2026-10-14T19:42:00", "Europe/London").toISOString()).toBe("2026-10-14T18:42:00.000Z");
    expect(zonedToUtc("2026-12-01T09:00:00", "Europe/London").toISOString()).toBe("2026-12-01T09:00:00.000Z");
    expect(zonedToUtc("2026-10-25T01:30:00", "Europe/London").toISOString()).toMatch(/^2026-10-25T0[01]:30:00/);
    expect(zonedToUtc("2026-07-04T12:00:00", "America/New_York").toISOString()).toBe("2026-07-04T16:00:00.000Z");
    expect(utcToZoned(new Date("2026-10-14T23:30:00Z"), "Europe/London")).toBe("2026-10-15T00:30:00");
  });
});
