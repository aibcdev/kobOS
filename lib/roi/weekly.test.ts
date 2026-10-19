import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { guardEmail, numberGuard, weeklyEmail } from "@/lib/roi/email";
import type { StoredMetric, WeekSnapshot } from "@/lib/roi/ledger";
import { weeklyReceiptParams } from "@/lib/roi/whatsapp";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const live = (value: number, unit: StoredMetric["unit"], count: number): StoredMetric => ({ state: "LIVE", value, unit, count, sources: ["SQUARE"], connect: [] });
const off = (unit: StoredMetric["unit"]): StoredMetric => ({ state: "OFF", value: null, unit, count: 0, sources: [], connect: ["OPENTABLE", "RESY"] });

const snapshot: WeekSnapshot = {
  weekStart: "2026-10-12",
  timezone: "Europe/London",
  currency: "GBP",
  standardMinutesVersion: "2026-10",
  metrics: {
    net_sales: live(1234567, "money", 412),
    delivery_sales: live(98000, "money", 31),
    returning_guests: live(57, "count", 57),
    bookings: off("count"),
    kob_actions: live(9, "count", 9),
    time_saved: live(79, "minutes", 9),
    kob_value: live(0, "money", 0),
  },
};

describe("weekly email and number guard (T-92)", () => {
  const email = weeklyEmail({ restaurantName: "Pizza 4 You", restaurantId: "r_1", snapshot, locale: "en-GB", appUrl: "https://trykob.com" });

  it("renders snapshot values, OFF hints and click-through links", () => {
    expect(email.subject).toBe("Your week at Pizza 4 You");
    expect(email.text).toContain("Sales: £12,345.67");
    expect(email.text).toContain("1 h 19 min");
    expect(email.text).toContain("Bookings: off. Connect OpenTable or Resy");
    expect(email.html).toContain("https://trykob.com/app/roi/2026-10-12/net_sales?r=r_1");
    expect(email.html).toContain("/app/roi/2026-10-12/print?r=r_1");
    expect(email.allowed).toContain("12 – 18 Oct 2026");
  });

  it("separates what happened from what KOB did, and shows no number for unearned value", () => {
    const order = ["YOUR WEEK", "KOB'S WORK", "VALUE FROM KOB (VERIFIED)"].map((h) => email.text.indexOf(h));
    expect(order.every((i, n) => i > -1 && (n === 0 || i > order[n - 1]))).toBe(true);
    expect(email.text.indexOf("Sales: £12,345.67")).toBeLessThan(order[1]);
    expect(email.text.slice(order[2])).toContain("Nothing yet. This fills in when KOB's phone, ordering or win-back are on.");
    expect(email.text).not.toMatch(/Value from KOB: /);
    expect(email.html).toContain("Value from KOB (verified)");
    expect(email.html).not.toContain("/app/roi/2026-10-12/kob_value");
    expect(email.allowed).not.toContain("£0.00");
  });

  it("treats a week saved before verified value existed as empty", () => {
    const older: Partial<WeekSnapshot["metrics"]> = { ...snapshot.metrics };
    delete older.kob_value;
    const old = weeklyEmail({ restaurantName: "Pizza 4 You", restaurantId: "r_1", snapshot: { ...snapshot, metrics: older as WeekSnapshot["metrics"] }, locale: "en-GB", appUrl: "https://trykob.com" });
    expect(old.text).toContain("Nothing yet.");
    expect(guardEmail(old, "Pizza 4 You").ok).toBe(true);
  });

  it("leads with verified value once KOB has earned some", () => {
    const earned = weeklyEmail({ restaurantName: "Pizza 4 You", restaurantId: "r_1", snapshot: { ...snapshot, metrics: { ...snapshot.metrics, kob_value: live(4200, "money", 3) } }, locale: "en-GB", appUrl: "https://trykob.com" });
    expect(earned.subject).toBe("Your week at Pizza 4 You: £42.00 verified from KOB");
    expect(earned.text).toContain("Value from KOB: £42.00");
    expect(earned.text).not.toContain("Nothing yet.");
    expect(guardEmail(earned, "Pizza 4 You").ok).toBe(true);
  });

  it("passes a clean render, including a name with digits", () => {
    expect(guardEmail(email, "Pizza 4 You")).toEqual({ ok: true, stray: [] });
  });

  it("blocks any number that isn't in the snapshot", () => {
    const tampered = { ...email, text: email.text.replace("Sales:", "Up 18% on last week. Sales:") };
    expect(guardEmail(tampered, "Pizza 4 You")).toMatchObject({ ok: false, stray: ["18%"] });
    expect(guardEmail({ ...email, subject: `${email.subject} (+£200)` }, "Pizza 4 You").ok).toBe(false);
    expect(numberGuard("You saved 3 hours", ["1 h 19 min"]).stray).toEqual(["3"]);
    expect(numberGuard("<p>£1,234.56</p> https://x.com/a1", ["£1,234.56"]).ok).toBe(true);
  });

  it("builds the WhatsApp receipt from the same figures, or nothing when there's nothing to say", () => {
    expect(weeklyReceiptParams({ restaurantName: "Pizza 4 You", snapshot, locale: "en-GB", link: "https://trykob.com/app/roi" })).toEqual([
      "Pizza 4 You",
      "12 – 18 Oct 2026",
      "£12,345.67 in sales, 9 jobs done by KOB, about 1 h 19 min saved",
      "https://trykob.com/app/roi",
    ]);
    const empty = { ...snapshot, metrics: { ...snapshot.metrics, net_sales: off("money"), kob_actions: live(0, "count", 0), time_saved: live(0, "minutes", 0) } };
    expect(weeklyReceiptParams({ restaurantName: "X", snapshot: empty, locale: "en-GB", link: "" })).toBeNull();
  });
});

describe("send window (T-92)", () => {
  it("opens Monday 08:30–09:30 local, DST included", async () => {
    const { isDue, dueNow } = await import("@/lib/roi/deliver");
    expect(isDue(new Date("2026-10-19T07:30:00Z"), "Europe/London")).toBe(true); // 08:30 BST
    expect(isDue(new Date("2026-10-19T07:29:00Z"), "Europe/London")).toBe(false);
    expect(isDue(new Date("2026-10-19T08:30:00Z"), "Europe/London")).toBe(false); // 09:30 BST
    expect(isDue(new Date("2026-10-26T08:45:00Z"), "Europe/London")).toBe(true); // 08:45 GMT after the clocks change
    expect(isDue(new Date("2026-10-18T19:30:00Z"), "Pacific/Auckland")).toBe(true); // Monday 08:30 NZDT, Sunday in UTC
    expect(isDue(new Date("2026-10-20T07:30:00Z"), "Europe/London")).toBe(false); // Tuesday
    expect(dueNow([{ id: "a", timezone: "Europe/London" }, { id: "b", timezone: "America/New_York" }], new Date("2026-10-19T07:40:00Z"))).toEqual([
      { restaurantId: "a", weekStart: "2026-10-12" },
    ]);
  });
});

describeDb("weekly delivery on Postgres (T-92)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let deliver: typeof import("@/lib/roi/deliver");
  let restaurantId: string;
  const now = new Date("2026-10-19T07:35:00Z");

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    deliver = await import("@/lib/roi/deliver");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "Europe/London", countryCode: "GB" } });
    const base = { restaurantId, currency: "GBP", sourceKind: "API", sourceProvider: "SQUARE", channel: "DINE_IN" };
    await prisma.order.create({ data: { ...base, status: "COMPLETED", placedAt: new Date("2026-10-14T12:00:00Z"), totalMinor: 4250, sourceExternalId: "w1" } });
  });

  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
  });

  it("does nothing while the flag is off", async () => {
    const send = vi.fn();
    expect(await deliver.deliverWeek(restaurantId, undefined, { send, now })).toMatchObject({ status: "flag_off", weekStart: "2026-10-12" });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends once to the owner, stamps sentAt, and releases the claim if Resend fails", async () => {
    await prisma.featureFlagOverride.create({ data: { restaurantId, name: "ROI_WEEKLY_EMAIL", enabled: true } });
    expect((await deliver.weeklyCandidates()).map((c) => c.id)).toContain(restaurantId);

    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(deliver.deliverWeek(restaurantId, "2026-10-12", { send: failing, now })).rejects.toThrow("boom");
    const afterFail = await prisma.roiWeek.findFirstOrThrow({ where: { restaurantId } });
    expect(afterFail.sentAt).toBeNull();

    const send = vi.fn().mockResolvedValue(undefined);
    expect(await deliver.deliverWeek(restaurantId, "2026-10-12", { send, now })).toMatchObject({ status: "sent", whatsapp: "flag_off" });
    expect(send).toHaveBeenCalledTimes(1);
    const msg = send.mock.calls[0][0];
    expect(msg.to).toEqual([expect.stringMatching(/^owner-.+@example\.com$/)]);
    expect(msg.text).toContain("Sales: £42.50");
    const saved = await prisma.roiWeek.findFirstOrThrow({ where: { restaurantId } });
    expect(saved.sentAt?.toISOString()).toBe(now.toISOString());

    expect(await deliver.deliverWeek(restaurantId, "2026-10-12", { send, now })).toMatchObject({ status: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("skips a week with no records at all", async () => {
    const send = vi.fn();
    expect(await deliver.deliverWeek(restaurantId, "2026-09-07", { send, now })).toMatchObject({ status: "empty_week" });
    expect(send).not.toHaveBeenCalled();
  });
});
