import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { clientIpFromHeaders } from "@/lib/security/rate-limit";

const h = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  return { user: null as string | null };
});

vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () => (h.user ? { ok: true, userId: h.user } : { ok: false, status: 401, message: "Unauthorized" }),
}));
vi.mock("@/lib/billing/stripe-server", () => ({
  requireStripe: () => ({}),
  getStripeFoundingPriceId: () => "price_founding",
  checkoutCurrencyFor: () => "gbp",
}));
vi.mock("@/lib/billing/checkout-subscription-session", () => ({ createSubscriptionCheckoutSession: async () => ({ url: "https://checkout.test/s" }) }));
vi.mock("@/lib/billing/free-trial-subscription", () => ({ createFreeTrialSubscription: async () => ({ subscriptionId: "sub", customerId: "cus", trialEndsAt: "x" }) }));
vi.mock("@/lib/restaurant/hydrate-from-audit", () => ({ hydrateRestaurantFromLinkedAudit: async () => undefined }));
vi.mock("@/lib/chief-of-staff/ensure-today-brief", () => ({ ensureTodayBrief: async () => undefined }));

describe("client IP (review H-5)", () => {
  it("never trusts the client-supplied first X-Forwarded-For hop", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "6.6.6.6", "x-nf-client-connection-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "192.0.2.1" }))).toBe("192.0.2.1");
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});

describeDb("/api/trial limits (review H-6, L-4)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let POST: typeof import("@/app/api/trial/route").POST;
  const userId = randomUUID();
  let otherRestaurantId = "";

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    POST = (await import("@/app/api/trial/route")).POST;
    await prisma.user.create({ data: { id: userId, email: `trial-${userId.slice(0, 8)}@example.com` } });
    otherRestaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });

  afterAll(async () => {
    const owned = await prisma.teamMember.findMany({ where: { userId }, select: { restaurantId: true } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [...owned.map((o) => o.restaurantId), otherRestaurantId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  const post = (body: Record<string, unknown>) =>
    POST(new Request("http://localhost/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

  it("reuses the owner's restaurant, returns an active trial instead of a new one, and caps attempts", async () => {
    h.user = userId;
    const first = await (await post({ restaurantName: "Mama's" })).json();
    expect(first).toMatchObject({ mode: "checkout", checkoutUrl: "https://checkout.test/s" });
    const second = await (await post({ restaurantName: "Mama's Kitchen", tier: "starter" })).json();
    expect(second.restaurantId).toBe(first.restaurantId);
    expect(await prisma.teamMember.count({ where: { userId, role: "OWNER" } })).toBe(1);
    expect((await prisma.restaurant.findUniqueOrThrow({ where: { id: first.restaurantId } })).name).toBe("Mama's Kitchen");

    await prisma.restaurant.update({ where: { id: first.restaurantId }, data: { trialStartedAt: new Date() } });
    expect(await (await post({ restaurantName: "Another", mode: "direct" })).json()).toMatchObject({ mode: "existing", restaurantId: first.restaurantId });

    expect((await post({ restaurantName: "Again" })).status).toBe(429);
  });

  it("won't let an unowned-email audit be claimed after another restaurant has it", async () => {
    const other = randomUUID();
    await prisma.user.create({ data: { id: other, email: `claim-${other.slice(0, 8)}@example.com` } });
    const audit = await prisma.visibilityAudit.create({ data: { restaurantName: "X", city: "London", overallScore: 50, seoScore: 50, designScore: 50, mobileScore: 50, conversionScore: 50, restaurantId: otherRestaurantId } });
    h.user = other;
    expect((await post({ restaurantName: "Claimer", visibilityAuditId: audit.id })).status).toBe(403);
    await prisma.visibilityAudit.delete({ where: { id: audit.id } });
    await prisma.teamMember.deleteMany({ where: { userId: other } });
    await prisma.user.delete({ where: { id: other } });
  });
});
