import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ExecStep } from "@/lib/agent/executor";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fakeFetch, fixture } from "@/tests/helpers/fake-fetch";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.INTEGRATION_ENC_KEY ??= Buffer.alloc(32, 7).toString("base64");
});
// No language service: the reply must still be drafted (safe template), never "being prepared" forever.
vi.mock("@/lib/ai/gemini-config", () => ({
  isGeminiConfigured: () => false,
  geminiTextCompletion: async () => ({ ok: false, error: "not configured" }),
}));
vi.mock("@/inngest/client", () => ({ inngest: { send: async () => ({ ids: [] }) } }));

const LOCATION = "accounts/2099000000000000001/locations/5582000000000000001";
const SLOW = `${LOCATION}/reviews/SLOW_SERVICE_1`;
const step: ExecStep = { run: (_id, fn) => fn(), sleep: async () => undefined, sleepUntil: async () => undefined, sendEvent: async () => undefined };

describe("templateReviewReply", () => {
  it("thanks the guest and, for low stars, asks them to get in touch without promising anything", async () => {
    const { templateReviewReply } = await import("@/lib/connectors/gbp/drafter");
    const low = templateReviewReply({ restaurantName: "Godfather", reviewerName: "Thandi Mokoena", rating: 1 });
    expect(low).toMatch(/^Hi Thandi, thank you/);
    expect(low).toMatch(/get in touch with us directly/);
    expect(low).not.toMatch(/refund|discount|free|voucher/i);
    expect(templateReviewReply({ restaurantName: "Godfather", reviewerName: null, rating: 5 })).toMatch(/^Thank you for the kind words/);
  });
});

describeDb("dashboard Approve on a review task publishes through the action ledger", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let connected: { restaurantId: string; userId: string };
  let unconnected: { restaurantId: string; userId: string };
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  async function seedReviewAndTask(restaurantId: string, externalReviewId: string) {
    await prisma.customerReview.create({
      data: {
        restaurantId,
        source: "GOOGLE",
        externalReviewId,
        reviewerName: "Thandi Mokoena",
        rating: 1,
        body: "Tuesday night was empty and our mains still took 50 minutes. Slow service again.",
        reviewedAt: new Date(Date.now() - 86_400_000),
      },
    });
    return prisma.chiefOfStaffTask.create({
      data: { restaurantId, title: "Reply to the 1-star about slow service", category: "REVIEWS", source: "AI" },
    });
  }

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    const { encryptSecret } = await import("@/lib/crypto/tokens");
    const a = await seedRestaurant(prisma);
    const b = await seedRestaurant(prisma);
    connected = { restaurantId: a.restaurant.id, userId: a.userId };
    unconnected = { restaurantId: b.restaurant.id, userId: b.userId };
    await prisma.restaurant.update({ where: { id: connected.restaurantId }, data: { name: "Godfather" } });
    await prisma.integration.create({
      data: {
        restaurantId: connected.restaurantId,
        provider: "GBP",
        status: "CONNECTED",
        externalAccountId: LOCATION,
        metadata: { locationIds: [LOCATION] },
        encryptedAccessToken: encryptSecret("g-tok"),
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    await prisma.featureFlagOverride.create({ data: { restaurantId: connected.restaurantId, name: "GBP_LIVE", enabled: true } });
  });

  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: [connected.restaurantId, unconnected.restaurantId] } } });
  });

  it("drafts the exact reply into Needs you, then one approval posts it once and reads it back", async () => {
    const { executeTaskApprove } = await import("@/lib/chief-of-staff/execute-task-approve");
    const task = await seedReviewAndTask(connected.restaurantId, SLOW);

    const result = await executeTaskApprove(task, connected.userId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).not.toMatch(/being prepared/);
    expect(result.nextHref).toBe(`/app/actions/${result.actionId}`);

    const action = await prisma.osAction.findUniqueOrThrow({ where: { id: result.actionId! } });
    expect(action.status).toBe("AWAITING_APPROVAL");
    const payload = action.proposedPayload as { actionType: string; reviewId: string; replyText: string };
    expect(payload).toMatchObject({ actionType: "gbp.review.reply", reviewId: SLOW });
    expect(payload.replyText).toMatch(/^Hi Thandi, thank you/);
    const draft = await prisma.generatedContent.findFirstOrThrow({ where: { restaurantId: connected.restaurantId, type: "GROWTH_REVIEW_REPLY" } });
    expect(draft).toMatchObject({ output: payload.replyText, published: false });
    // Approving the task drafted only: nothing has gone to Google.
    expect(fetchSpy).not.toHaveBeenCalled();

    // The owner approves the wording; the executor posts and reads back.
    const { approve } = await import("@/lib/agent/ledger");
    await approve(action.id, connected.userId);
    let written: string | null = null;
    const google = fakeFetch([
      {
        method: "PUT",
        match: /\/reviews\/SLOW_SERVICE_1\/reply$/,
        reply: (call) => {
          written = (call.body as { comment: string }).comment;
          return { json: { ...fixture<object>("gbp", "reply.json"), comment: written } };
        },
      },
      {
        method: "GET",
        match: /\/reviews\/SLOW_SERVICE_1$/,
        reply: () => ({
          json: {
            name: SLOW,
            starRating: "ONE",
            createTime: "2026-10-21T19:00:00Z",
            updateTime: "2026-10-21T19:00:00Z",
            ...(written ? { reviewReply: { comment: written, updateTime: "2026-10-22T09:00:03Z" } } : {}),
          },
        }),
      },
    ]);
    const { createGbpAdapter } = await import("@/lib/connectors/gbp/adapter");
    const { executeApprovedAction } = await import("@/lib/agent/executor");
    const adapter = createGbpAdapter({ fetch: google.fetch });
    expect(
      await executeApprovedAction({ actionId: action.id, restaurantId: connected.restaurantId, connectorKey: `${connected.restaurantId}:GBP` }, step, () => adapter),
    ).toEqual({ status: "VERIFIED" });

    const puts = google.calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].body).toEqual({ comment: payload.replyText });
    expect((await prisma.osAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe("VERIFIED");
    expect((await prisma.customerReview.findFirstOrThrow({ where: { externalReviewId: SLOW } })).replied).toBe(true);
    expect((await prisma.generatedContent.findUniqueOrThrow({ where: { id: draft.id } })).published).toBe(true);
  });

  it("without Google connected: keeps the draft, says so, and proposes nothing", async () => {
    const { executeTaskApprove } = await import("@/lib/chief-of-staff/execute-task-approve");
    const task = await seedReviewAndTask(unconnected.restaurantId, `${LOCATION}/reviews/OTHER_VENUE_1`);
    const result = await executeTaskApprove(task, unconnected.userId);
    expect(result).toMatchObject({ ok: false, status: 409, code: "connect_google" });
    expect(await prisma.osAction.count({ where: { restaurantId: unconnected.restaurantId } })).toBe(0);
    expect(await prisma.generatedContent.count({ where: { restaurantId: unconnected.restaurantId, type: "GROWTH_REVIEW_REPLY" } })).toBe(1);
    expect((await prisma.chiefOfStaffTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe("PENDING");
  });
});
