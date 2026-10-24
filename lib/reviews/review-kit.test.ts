import QRCode from "qrcode";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { reviewAskMessage, reviewLinkForPlace, reviewQrSvg, tableCardHtml } from "./review-kit";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("@/lib/ai/gemini-config", () => ({ isGeminiConfigured: () => false, geminiTextCompletion: async () => ({ ok: false, error: "off" }) }));

const URL_ = reviewLinkForPlace("ChIJ_godfather_capetown");

describe("review kit", () => {
  it("links straight to the Google review form for the place", () => {
    expect(URL_).toBe("https://search.google.com/local/writereview?placeid=ChIJ_godfather_capetown");
  });

  it("the QR code encodes exactly the review link", async () => {
    const svg = await reviewQrSvg(URL_);
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
    const encoded = QRCode.create(URL_, { errorCorrectionLevel: "M" })
      .segments.map((s) => Buffer.from((s as unknown as { data: Uint8Array }).data).toString("utf8"))
      .join("");
    expect(encoded).toBe(URL_);
  });

  it("prints two cards with the name escaped and no incentive", async () => {
    const html = await tableCardHtml(`Harbour & Rye <Bristol>`, URL_);
    expect(html).toContain("Harbour &amp; Rye &lt;Bristol&gt;");
    expect(html.match(/class="card"/g)).toHaveLength(2);
    expect(html).not.toMatch(/discount|free|voucher|% off/i);
  });

  it("the thank-you carries the link and never offers anything for a review", () => {
    const sms = reviewAskMessage("Godfather", URL_, "sms");
    expect(sms.body).toContain(URL_);
    expect(sms.body).not.toMatch(/discount|free|voucher|% off|win/i);
    expect(reviewAskMessage("Godfather", URL_, "email").subject).toBe("Thanks for visiting Godfather");
  });
});

describeDb("the review link comes from the listing, then the audit", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    const seeded = await seedRestaurant(prisma);
    restaurantId = seeded.restaurant.id;
    userId = seeded.userId;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  });

  it("null with nothing known; audit place id next; Google's own link wins once the listing is read", async () => {
    const { googleReviewLink } = await import("./review-kit");
    expect(await googleReviewLink(restaurantId)).toBeNull();

    await prisma.visibilityAudit.create({
      data: {
        restaurantId,
        websiteUrl: "https://godfather.example",
        restaurantName: "Godfather",
        city: "Cape Town",
        overallScore: 60,
        seoScore: 60,
        designScore: 60,
        mobileScore: 60,
        conversionScore: 60,
        resultPayload: { geoLocation: { lat: 0, lng: 0, city: "Cape Town", source: "place_input", placeId: "ChIJ_audit" } },
      },
    });
    expect(await googleReviewLink(restaurantId)).toEqual({ url: reviewLinkForPlace("ChIJ_audit"), source: "audit" });

    await prisma.osFact.create({
      data: { restaurantId, key: "gbp.listing", valueJson: { reviewUri: "https://g.page/r/godfather/review", hours: [] }, source: "GBP", lastUpdatedAt: new Date() },
    });
    expect(await googleReviewLink(restaurantId)).toEqual({ url: "https://g.page/r/godfather/review", source: "listing" });

    const { answerFromFacts } = await import("@/lib/kob/talk/fallback");
    const a = await answerFromFacts(restaurantId, userId, "Nudge last night's happy guests to leave a Google review.");
    expect(a.intent).toBe("review_ask");
    expect(a.text).toContain("https://g.page/r/godfather/review");
    expect(a.text).toMatch(/won't guess/);
  });
});
