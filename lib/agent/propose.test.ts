import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
const send = vi.hoisted(() => vi.fn());
vi.mock("@/inngest/client", () => ({ inngest: { send } }));

describeDb("proposeAction", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ({ restaurant: { id: restaurantId }, userId } = await seedRestaurant(prisma));
  });
  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  const payload = (reviewId: string) => ({ actionType: "gbp.review.reply", reviewId, replyText: "Thank you!" });
  const healthy = { connectorHealthy: async () => true };

  it("ASK leaves the card for the owner", async () => {
    const { proposeAction } = await import("@/lib/agent/propose");
    const { action, policy } = await proposeAction({ restaurantId, title: "Reply", payload: payload("p1") }, healthy);
    expect(policy?.decision).toBe("ASK");
    expect(action.status).toBe("AWAITING_APPROVAL");
    expect(send).not.toHaveBeenCalled();
  });

  it("DENY closes the action with the reason", async () => {
    const { proposeAction } = await import("@/lib/agent/propose");
    const { action } = await proposeAction({ restaurantId, title: "Reply", payload: payload("p2") });
    expect(action.status).toBe("FAILED");
    expect(action.failureCode).toBe("DENIED_NEEDS_CONNECTION");
  });

  it("AUTO approves as policy and hands off to the executor", async () => {
    await prisma.osPermissionGrant.create({
      data: { restaurantId, actionType: "gbp.review.reply", connector: "GBP", scope: "ALWAYS", limitsJson: { minRating: 4 }, grantedByUserId: userId },
    });
    await prisma.osWorkflowReliability.create({ data: { restaurantId, workflowId: "gbp.review.reply", score: 0.95, sampleN: 9 } });
    const { proposeAction } = await import("@/lib/agent/propose");
    const { action, policy } = await proposeAction(
      { restaurantId, title: "Reply", payload: payload("p3"), subject: { rating: 5 } },
      healthy,
    );
    expect(policy?.decision).toBe("AUTO");
    expect(action).toMatchObject({ status: "APPROVED", approvedBy: "policy" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ name: "kob/action.approved" }));
  });
});
