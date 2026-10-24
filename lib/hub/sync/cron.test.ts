import { describe, expect, it } from "vitest";
import { nextCronTime, parseCron } from "@/lib/hub/sync/cron";

const at = (iso: string) => new Date(iso);

describe("nextCronTime (UTC)", () => {
  it.each([
    ["*/5 * * * *", "2026-10-19T10:03:20Z", "2026-10-19T10:05:00Z"],
    ["*/5 * * * *", "2026-10-19T10:05:00Z", "2026-10-19T10:10:00Z"],
    ["0 */6 * * *", "2026-10-19T10:03:00Z", "2026-10-19T12:00:00Z"],
    ["30 */6 * * *", "2026-10-19T18:30:00Z", "2026-10-20T00:30:00Z"],
    ["0 3 * * *", "2026-10-19T03:00:00Z", "2026-10-20T03:00:00Z"],
    ["30 8 * * 1", "2026-10-19T09:00:00Z", "2026-10-26T08:30:00Z"],
    ["0 0 1 * *", "2026-12-15T00:00:00Z", "2027-01-01T00:00:00Z"],
    ["15,45 9-10 * * *", "2026-10-19T09:20:00Z", "2026-10-19T09:45:00Z"],
  ])("%s after %s → %s", (expr, from, want) => {
    expect(nextCronTime(expr, at(from)).toISOString()).toBe(new Date(want).toISOString());
  });

  it("rejects malformed expressions", () => {
    expect(() => parseCron("* * * *")).toThrow();
    expect(() => parseCron("61 * * * *")).toThrow();
    expect(() => parseCron("*/0 * * * *")).toThrow();
  });
});
