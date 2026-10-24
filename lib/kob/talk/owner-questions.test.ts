import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
// No language service: every answer must come from the restaurant's own data.
vi.mock("@/lib/ai/gemini-config", () => ({
  isGeminiConfigured: () => false,
  geminiTextCompletion: async () => ({ ok: false, error: "not configured" }),
}));

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { describeDb } from "@/tests/helpers/db";
import { answerFromFacts } from "./fallback";
import { parseHouseRule } from "./restaurant-facts";
import { mothersDay } from "@/lib/locale/holidays";

/** The owner script from KOB_FIX_BRIEF.md §4, in order. */
const QUESTIONS = [
  ["What should I do about my reviews this week?", "reviews_week"],
  ["Reply to the 1-star about slow service.", "reply_review"],
  ["Tuesday nights are dead, help.", "quiet_night"],
  ["Write an Instagram post for our new ribeye.", "social_post"],
  ["Never discount Fridays.", "house_rule"],
  ["What changed on my Google listing?", "listing"],
  ["How many reviews did we get this month?", "review_count"],
  ["Draft a Mother's Day offer.", "mothers_day"],
  ["Our hours changed to close at 22:00 on Sundays.", "hours"],
  ["Cancel my trial.", "trial"],
  ["Are our Google hours the same as the website?", "listing"],
  ["A guest said the ribeye was overcooked. Draft a reply in my voice.", "reply_review"],
  ["Nudge last night's happy guests to leave a Google review.", "review_ask"],
  ["What is quiet on the books this week?", "quiet_books"],
  ["Post the reply to Google now.", "post_reply"],
  ["Learn this house rule: we never comp drinks on a Friday.", "house_rule"],
  ["What is our price point and who are we for?", "profile"],
  ["Send me the morning brief by email.", "brief"],
  ["Approve everything that is waiting.", "approvals"],
  ["How much will I pay after the trial, in rand?", "price"],
] as const;

const BANNED = /\b(AI|artificial intelligence|bot|chatbot|automated|automation|automatically|autopilot|agent|machine learning|algorithm)\b/i;
// "Posted"/"published"/"sent" as a done claim — Talk must never say it did any of these.
const CLAIMS_DONE = /\b(I(?:'ve| have)? (posted|published|sent|updated|approved))\b/i;

const NOW = new Date("2026-10-22T09:00:00Z"); // a Thursday

type Venue = { id: string; userId: string; currency: string; symbol: string; country: string; name: string };

async function seedVenue(opts: { name: string; city: string; country: string; tz: string; cuisine: string; pricePoint: string; googleConnected: boolean }): Promise<Venue> {
  const suffix = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const r = await prisma.restaurant.create({
    data: {
      name: opts.name,
      slug: `${opts.name.toLowerCase().replace(/\W+/g, "-")}-${suffix}`,
      city: opts.city,
      countryCode: opts.country,
      timezone: opts.tz,
      cuisineType: opts.cuisine,
      trialStartedAt: new Date(NOW.getTime() - 2 * 86_400_000),
    },
  });
  await prisma.user.create({ data: { id: userId, email: `owner-${suffix}@example.com` } });
  await prisma.teamMember.create({ data: { userId, restaurantId: r.id, role: "OWNER" } });
  await prisma.osFact.create({
    data: { restaurantId: r.id, key: "price_point", valueJson: { text: opts.pricePoint }, source: "owner", lastUpdatedAt: NOW },
  });
  const reviews = [
    ...Array.from({ length: 24 }, (_, i) => ({ rating: 5, body: `Lovely evening, great steak and friendly staff (${i}).`, days: 3 + i * 2 })),
    { rating: 4, body: "Good food, a little loud.", days: 1 },
    { rating: 2, body: "Slow service again, waited 50 minutes for mains.", days: 2 },
    { rating: 1, body: "Tuesday night was empty and our mains still took 50 minutes. Slow service.", days: 1 },
    { rating: 2, body: "The ribeye was overcooked and dry.", days: 5 },
    { rating: 3, body: "Fine, nothing special.", days: 12 },
    { rating: 5, body: "Sunday lunch ribeye was the best meal we have had this year.", days: 40 },
  ];
  for (const [i, rv] of reviews.entries())
    await prisma.customerReview.create({
      data: {
        restaurantId: r.id,
        source: "GOOGLE",
        externalReviewId: `accounts/1/locations/${suffix}/reviews/${i}`,
        reviewerName: ["Thandi Mokoena", "James Hill", "Sipho Ndlovu", "Amy Clarke"][i % 4],
        rating: rv.rating,
        body: rv.body,
        reviewedAt: new Date(NOW.getTime() - rv.days * 86_400_000),
        replied: rv.rating >= 4 && rv.days > 7,
      },
    });
  if (opts.googleConnected) {
    await prisma.integration.create({
      data: { restaurantId: r.id, provider: "GBP", status: "CONNECTED", externalAccountId: `accounts/1/locations/${suffix}` },
    });
    await prisma.featureFlagOverride.create({ data: { restaurantId: r.id, name: "GBP_LIVE", enabled: true } });
  }
  return {
    id: r.id,
    userId,
    country: opts.country,
    name: opts.name,
    currency: opts.country === "ZA" ? "ZAR" : "GBP",
    symbol: opts.country === "ZA" ? "R" : "£",
  };
}

describe("house rules", () => {
  it("reads day rules from plain English", () => {
    expect(parseHouseRule("Never discount Fridays.")).toMatchObject({ ruleType: "never_discount_day", day: "FRI", never: true });
    expect(parseHouseRule("we never comp drinks on a Friday")).toMatchObject({ ruleType: "never_comp_day", day: "FRI" });
    expect(parseHouseRule("Always greet regulars by name")).toMatchObject({ ruleType: "note", never: false });
  });
  it("knows Mother's Day by country", () => {
    expect(mothersDay("ZA", 2027)).toBe("2027-05-09");
    expect(mothersDay("GB", 2027)).toBe("2027-03-07");
  });
});

describeDb("Talk answers the 20 owner questions from the restaurant's data (no language service)", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  let godfather: Venue;
  let harbour: Venue;

  beforeAll(async () => {
    godfather = await seedVenue({
      name: "Godfather",
      city: "Cape Town",
      country: "ZA",
      tz: "Africa/Johannesburg",
      cuisine: "Steakhouse",
      pricePoint: "R400–500",
      googleConnected: true,
    });
    harbour = await seedVenue({
      name: "Harbour & Rye",
      city: "Bristol",
      country: "GB",
      tz: "Europe/London",
      cuisine: "Bistro",
      pricePoint: "£35–45",
      googleConnected: false,
    });
  });

  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: [godfather.id, harbour.id] } } });
  });

  for (const which of ["godfather", "harbour"] as const) {
    it(`${which}: every question gets a grounded answer, in local terms, with no banned words`, async () => {
      const v = which === "godfather" ? godfather : harbour;
      const answers: Record<number, { text: string; intent: string }> = {};
      for (const [i, [q, intent]] of QUESTIONS.entries()) {
        const a = await answerFromFacts(v.id, v.userId, q, { now: NOW });
        answers[i + 1] = a;
        expect(a.intent, q).toBe(intent);
        expect(a.text.length, q).toBeGreaterThan(20);
        expect(a.text, q).not.toMatch(BANNED);
        expect(a.text, q).not.toMatch(CLAIMS_DONE);
        expect(a.text, q).not.toMatch(which === "godfather" ? /£/ : /\bR\d/);
      }

      // 1, 7: real numbers from the seeded reviews
      expect(answers[1].text).toMatch(/need a reply|needs a reply/);
      expect(answers[7].text).toMatch(/\d+ reviews? this month/);
      // 2: the slow-service 1-star, drafted; in approvals only when Google is connected
      expect(answers[2].text).toMatch(/1-star/);
      expect(answers[2].text).toMatch(which === "godfather" ? /waiting in Needs you/ : /Draft — not posted/);
      // 3, 8: local currency, never invented prices
      expect(answers[3].text).toContain(v.currency);
      expect(answers[8].text).toContain(v.currency);
      expect(answers[8].text).toMatch(which === "godfather" ? /Sunday 9 May/ : /Sunday 7 March/);
      // 5, 16: rules saved once
      const rules = await prisma.osRestaurantRule.findMany({ where: { restaurantId: v.id, scope: "house" } });
      expect(rules.map((r) => r.ruleType).sort()).toEqual(["never_comp_day", "never_discount_day"]);
      // 10, 20: trial and price from the plan, USD for ZA until rand billing exists
      expect(answers[10].text).toMatch(/free trial ends/);
      expect(answers[20].text).toMatch(which === "godfather" ? /\$99.*charged in USD/ : /£79/);
      // 13: never invents guests
      expect(answers[13].text).toMatch(/won't guess/);
      // 17: profile
      expect(answers[17].text).toContain(which === "godfather" ? "R400–500" : "£35–45");
      // 19: no bulk approval from a message
      expect(answers[19].text).toMatch(which === "godfather" ? /won't approve these in bulk/ : /Nothing is waiting/);
    });
  }

  it("a quiet-night idea never discounts a day the owner protected", async () => {
    await answerFromFacts(harbour.id, harbour.userId, "Never discount Tuesdays.", { now: NOW });
    const a = await answerFromFacts(harbour.id, harbour.userId, "Tuesday nights are dead, help.", { now: NOW });
    expect(a.text).toMatch(/marked Tuesdays as busy or never to discount/);
    expect(a.text).not.toMatch(/half price/);
  });

  it("drafted replies wait for approval and nothing reaches Google", async () => {
    const waiting = await prisma.osAction.findMany({ where: { restaurantId: godfather.id, actionType: "gbp.review.reply" } });
    expect(waiting.length).toBeGreaterThanOrEqual(1);
    expect(waiting.every((a) => a.status === "AWAITING_APPROVAL")).toBe(true);
    expect(await prisma.osAction.count({ where: { restaurantId: harbour.id } })).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
