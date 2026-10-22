import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { priceForCountry } from "./regional-pricing";
import { billingFromStripe } from "./sync-stripe-subscription";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const DAY = 86_400_000;

describe("one price per country", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("£79 in the UK and Crown Dependencies, $99 everywhere else until local prices are set", () => {
    expect(priceForCountry("GB")).toMatchObject({ currency: "gbp", amount: 79, label: "£79" });
    expect(priceForCountry("JE")).toMatchObject({ currency: "gbp", amount: 79 });
    for (const c of ["IE", "US", "CA", "AU", "NZ", "IN", "ZA", null]) expect(priceForCountry(c)).toMatchObject({ currency: "usd", amount: 99, label: "US$99" });
  });

  it("a local price is a config change (KOB_PRICES); bad config falls back to the default", () => {
    vi.stubEnv("KOB_PRICES", JSON.stringify({ ZA: { currency: "ZAR", amount: 1499 }, IE: { currency: "eur", amount: 89 } }));
    expect(priceForCountry("ZA")).toMatchObject({ currency: "zar", amount: 1499, label: expect.stringMatching(/^ZAR\s1,499$/) });
    expect(priceForCountry("IE")).toMatchObject({ currency: "eur", amount: 89, label: "€89" });
    expect(priceForCountry("GB")).toMatchObject({ currency: "gbp", amount: 79 });
    vi.stubEnv("KOB_PRICES", "{not json");
    expect(priceForCountry("ZA")).toMatchObject({ currency: "usd", amount: 99 });
  });

  it("maps Stripe states onto the restaurant", () => {
    expect(billingFromStripe("trialing")).toEqual({ billingStatus: "ACTIVE", plan: "PRO" });
    expect(billingFromStripe("active")).toEqual({ billingStatus: "ACTIVE", plan: "PRO" });
    expect(billingFromStripe("past_due")).toEqual({ billingStatus: "PAST_DUE", plan: "PRO" });
    expect(billingFromStripe("canceled")).toEqual({ billingStatus: "CANCELED", plan: "FREE" });
  });
});

describe("adding a card", () => {
  it("bills the restaurant's own currency and waits for the trial to end", async () => {
    const { createSubscriptionCheckoutSession } = await import("./checkout-subscription-session");
    const create = vi.fn(async (p: unknown) => ({ url: "https://checkout.test", params: p }));
    const stripe = { checkout: { sessions: { create } } } as never;
    const ends = new Date(Date.now() + 4 * DAY);
    await createSubscriptionCheckoutSession({
      stripe,
      restaurantId: "r1",
      customerEmail: "owner@example.com",
      product: "prod_kob",
      currency: "zar",
      amount: 1499,
      trialEndsAt: ends,
      origin: "https://trykob.com",
      successPath: "/ok",
      cancelPath: "/no",
    });
    const p = create.mock.calls[0][0] as {
      line_items: { price_data: { currency: string; unit_amount: number; product: string } }[];
      subscription_data: { trial_end?: number };
      payment_method_collection: string;
    };
    expect(p.line_items[0].price_data).toMatchObject({ currency: "zar", unit_amount: 149900, product: "prod_kob" });
    expect(p.subscription_data.trial_end).toBe(Math.floor(ends.getTime() / 1000));
    expect(p.payment_method_collection).toBe("always");
  });
});

describeDb("the trial lives on the restaurant", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  const ids: string[] = [];
  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: ids } } });
  });

  it("starts with no card, one per owner; at day 8 it ends read-only and nothing is charged", async () => {
    const trial = await import("./trial");
    const { proposeAction } = await import("@/lib/agent/propose");
    const start = new Date("2026-10-01T09:00:00Z");
    const a = await seedRestaurant(prisma);
    ids.push(a.restaurant.id);

    const ends = await trial.startTrial(prisma, a.restaurant.id, a.userId, start);
    expect(ends?.toISOString()).toBe("2026-10-08T09:00:00.000Z");
    const row = await prisma.restaurant.findUniqueOrThrow({ where: { id: a.restaurant.id } });
    expect(row).toMatchObject({ subscriptionPlan: "TRIAL", billingStatus: "TRIALING", stripeSubscriptionId: null });
    expect(trial.trialState(row, new Date(start.getTime() + 2 * DAY))).toMatchObject({ kind: "trialing", daysLeft: 5 });

    // A second restaurant for the same owner doesn't get another trial.
    const second = await prisma.restaurant.create({ data: { name: "Second", slug: `second-${Date.now()}` } });
    ids.push(second.id);
    await prisma.teamMember.create({ data: { userId: a.userId, restaurantId: second.id, role: "OWNER" } });
    expect(await trial.startTrial(prisma, second.id, a.userId, start)).toBeNull();

    // Day-5 reminder: found exactly once across hourly ticks.
    let reminders = 0;
    for (let h = 0; h < 8 * 24; h++) {
      const due = await trial.trialsEndingSoon(new Date(start.getTime() + h * 3_600_000));
      reminders += due.filter((d) => d.id === a.restaurant.id).length;
    }
    expect(reminders).toBe(1);

    expect(await trial.canAct(a.restaurant.id, new Date(start.getTime() + 6 * DAY))).toEqual({ ok: true });
    const day8 = new Date(start.getTime() + 8 * DAY);
    expect((await trial.expireTrials(day8)).map((r) => r.id)).toContain(a.restaurant.id);
    const after = await prisma.restaurant.findUniqueOrThrow({ where: { id: a.restaurant.id } });
    expect(after).toMatchObject({ billingStatus: "TRIAL_ENDED", subscriptionPlan: "FREE", stripeSubscriptionId: null });
    expect(trial.trialState(after, day8)).toMatchObject({ kind: "ended" });

    // Read-only: a new proposal is recorded but closed with the reason.
    const check = await trial.canAct(a.restaurant.id, day8);
    expect(check).toMatchObject({ ok: false, code: "TRIAL_ENDED" });
    const { action } = await proposeAction({
      restaurantId: a.restaurant.id,
      title: "Reply",
      payload: { actionType: "gbp.review.reply", reviewId: "accounts/1/locations/2/reviews/3", replyText: "Thank you so much for visiting us." },
      now: day8,
    });
    expect(action).toMatchObject({ status: "FAILED", failureCode: "DENIED_TRIAL_ENDED" });

    // Expiring twice changes nothing.
    expect((await trial.expireTrials(day8)).map((r) => r.id)).not.toContain(a.restaurant.id);
  });
});
