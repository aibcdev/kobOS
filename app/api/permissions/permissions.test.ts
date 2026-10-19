import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const state = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () =>
    state.userId ? { ok: true, userId: state.userId } : { ok: false, status: 401, message: "Unauthorized" },
}));

const ORIGIN = "https://trykob.com";
const revokeReq = (id: string, origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}/api/permissions/${id}/revoke`, { method: "POST", headers: origin ? { origin } : {} });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/permissions/[id]/revoke without a session", () => {
  it("returns 401", async () => {
    state.userId = null;
    const { POST } = await import("@/app/api/permissions/[id]/revoke/route");
    expect((await POST(revokeReq("x"), params("x"))).status).toBe(401);
  });
});

describeDb("permission revoke on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ledger: typeof import("@/lib/agent/ledger");
  let grants: typeof import("@/lib/agent/grants");
  let POST: typeof import("@/app/api/permissions/[id]/revoke/route").POST;
  let own: { restaurantId: string; userId: string };
  let other: { restaurantId: string; userId: string };
  let staff: { userId: string; restaurantId: string };
  let n = 0;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ledger = await import("@/lib/agent/ledger");
    grants = await import("@/lib/agent/grants");
    POST = (await import("@/app/api/permissions/[id]/revoke/route")).POST;
    const a = await seedRestaurant(prisma);
    const b = await seedRestaurant(prisma);
    own = { restaurantId: a.restaurant.id, userId: a.userId };
    other = { restaurantId: b.restaurant.id, userId: b.userId };
    const s = await seedRestaurant(prisma);
    await prisma.teamMember.create({ data: { userId: s.userId, restaurantId: own.restaurantId, role: "MEMBER" } });
    staff = { userId: s.userId, restaurantId: s.restaurant.id };
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: [own.restaurantId, other.restaurantId, staff.restaurantId] } } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    state.userId = own.userId;
    await prisma.osPermissionGrant.deleteMany({ where: { restaurantId: own.restaurantId } });
    await prisma.osActionPermission.deleteMany({ where: { restaurantId: own.restaurantId } });
  });

  const reviewAction = (taskKey?: string) =>
    ledger.createProposal({
      restaurantId: own.restaurantId,
      title: "Reply to a 5★ review",
      taskKey,
      payload: { actionType: "gbp.review.reply", reviewId: `rv-${++n}`, replyText: "Thanks for visiting!" },
    });
  const mode = async () =>
    (
      await prisma.osActionPermission.findUnique({
        where: { restaurantId_actionType_category: { restaurantId: own.restaurantId, actionType: "gbp.review.reply", category: "" } },
      })
    )?.mode;

  it("revoking ALWAYS resets the permission to ASK and writes an audit event", async () => {
    const grant = await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    expect(await mode()).toBe("AUTO_WITH_LIMITS");

    const res = await POST(revokeReq(grant.id), params(grant.id));
    expect(res.status).toBe(200);
    expect((await res.json()).grant.revokedAt).toBeTruthy();
    expect(await mode()).toBe("ASK");
    expect(await grants.activeGrants(own.restaurantId)).toEqual([]);
    const audit = await prisma.osAuditEvent.findFirst({ where: { restaurantId: own.restaurantId, kind: "grant.revoked" }, orderBy: { createdAt: "desc" } });
    expect(audit?.payload).toMatchObject({ grantId: grant.id, scope: "ALWAYS", permissionReset: true, byUserId: own.userId });
  });

  it("keeps AUTO_WITH_LIMITS while another ALWAYS grant for the type is active", async () => {
    const first = await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    await grants.revokeGrant(first.id, own.userId);
    expect(await mode()).toBe("AUTO_WITH_LIMITS");
    expect(await grants.activeGrants(own.restaurantId)).toHaveLength(1);
  });

  it("revoking a TASK grant leaves the permission mode alone", async () => {
    await prisma.osActionPermission.create({ data: { restaurantId: own.restaurantId, actionType: "gbp.review.reply", mode: "ASK" } });
    const grant = await grants.grantFromApproval(await reviewAction("reviews-this-week"), own.userId, "TASK");
    expect((await grants.activeGrants(own.restaurantId)).map((g) => g.id)).toEqual([grant.id]);
    await grants.revokeGrant(grant.id, own.userId);
    expect(await mode()).toBe("ASK");
    expect(await grants.activeGrants(own.restaurantId)).toEqual([]);
  });

  it("is idempotent", async () => {
    const grant = await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    const first = await POST(revokeReq(grant.id), params(grant.id));
    const second = await POST(revokeReq(grant.id), params(grant.id));
    expect(second.status).toBe(200);
    expect((await second.json()).grant.revokedAt).toBe((await first.json()).grant.revokedAt);
    expect(await prisma.osAuditEvent.count({ where: { restaurantId: own.restaurantId, kind: "grant.revoked", payload: { path: ["grantId"], equals: grant.id } } })).toBe(1);
  });

  it("activeGrants skips expired TASK grants", async () => {
    const past = new Date(Date.now() - 48 * 3_600_000);
    await grants.grantFromApproval(await reviewAction("old-task"), own.userId, "TASK", undefined, past);
    expect(await grants.activeGrants(own.restaurantId)).toEqual([]);
  });

  it("another tenant gets 404 and the grant stays", async () => {
    const grant = await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    state.userId = other.userId;
    expect((await POST(revokeReq(grant.id), params(grant.id))).status).toBe(404);
    expect((await POST(revokeReq("missing"), params("missing"))).status).toBe(404);
    expect(await mode()).toBe("AUTO_WITH_LIMITS");
  });

  it("refuses cross-origin requests and roles that can't act on the type", async () => {
    const grant = await grants.grantFromApproval(await reviewAction(), own.userId, "ALWAYS");
    expect((await POST(revokeReq(grant.id, "https://evil.example"), params(grant.id))).status).toBe(403);
    state.userId = staff.userId;
    const res = await POST(revokeReq(grant.id), params(grant.id));
    expect(res.status).toBe(403);
    expect(await mode()).toBe("AUTO_WITH_LIMITS");
  });
});
