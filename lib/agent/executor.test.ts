import { NonRetriableError } from "inngest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ExecStep } from "@/lib/agent/executor";
import type { ActionAdapter } from "@/lib/agent/verify";
import { createMemoryActionAdapter, type MemoryAdapterOptions } from "@/lib/connectors/memory/adapter";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("@/inngest/client", () => ({ inngest: { send: vi.fn() } }));

function fakeStep(onSleepUntil?: () => Promise<void>) {
  const events: { name: string; data: Record<string, unknown> }[] = [];
  const step: ExecStep = {
    run: (_id, fn) => fn(),
    sleep: async () => undefined,
    sleepUntil: async () => onSleepUntil?.(),
    sendEvent: async (_id, payload) => events.push(payload),
  };
  return { step, events };
}

describe("memory adapter", () => {
  it("refuses action types it doesn't model", async () => {
    const { adapter } = createMemoryActionAdapter({ open: "12:00", close: "22:00" });
    const action = { proposedPayload: { actionType: "gbp.review.reply" } } as never;
    await expect(adapter.precheck(action)).rejects.toThrow(/can't run/);
  });
});

describeDb("executor on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ledger: typeof import("@/lib/agent/ledger");
  let exec: typeof import("@/lib/agent/executor");
  let restaurantId: string;
  let n = 0;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ledger = await import("@/lib/agent/ledger");
    exec = await import("@/lib/agent/executor");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  const hours = (open: string, close: string) => ({
    actionType: "gbp.hours.regular.update",
    gbpLocationId: `loc-${++n}`,
    periods: [{ day: "MONDAY", open, close }],
  });

  async function approved(payload: Record<string, unknown>, extra: Partial<import("@/lib/agent/ledger").ProposalInput> = {}) {
    const a = await ledger.createProposal({ restaurantId, title: "Hours", payload, ...extra });
    return ledger.approve(a.id, "owner");
  }
  const data = (id: string) => ({ actionId: id, restaurantId, connectorKey: `${restaurantId}:GBP` });
  const memory = (opts: MemoryAdapterOptions = {}) => createMemoryActionAdapter({ open: "12:00", close: "22:00" }, opts);
  const resolver = (adapter: ActionAdapter) => () => adapter;

  it("executes once, verifies by reading back, then shows Done", async () => {
    const m = memory();
    const a = await approved(hours("11:00", "23:00"));
    const out = await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter));
    expect(out).toEqual({ status: "VERIFIED" });
    expect(m.writes()).toBe(1);
    expect(m.snapshot()).toMatchObject({ open: "11:00", close: "23:00" });
    const row = await ledger.getAction(a.id);
    expect(row?.status).toBe("VERIFIED");
    const kinds = (await prisma.osAuditEvent.findMany({ where: { actionId: a.id }, orderBy: { createdAt: "asc" } })).map((e) => e.kind);
    expect(kinds).toEqual(["action.proposed", "action.approved", "action.executing", "action.executed", "action.verifying", "action.verified"]);
    const rel = await prisma.osWorkflowReliability.findUniqueOrThrow({
      where: { restaurantId_workflowId: { restaurantId, workflowId: "gbp.hours.regular.update" } },
    });
    expect(rel.sampleN).toBeGreaterThanOrEqual(1);
  });

  it("running the same approval twice writes to the provider once", async () => {
    const m = memory();
    const a = await approved(hours("10:00", "21:00"));
    await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter));
    expect(await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter))).toEqual({ skipped: "already-claimed" });
    expect(m.writes()).toBe(1);
  });

  it("already in the desired state → VERIFIED without writing", async () => {
    const m = memory();
    const a = await approved(hours("12:00", "22:00"));
    expect(await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter))).toEqual({
      status: "VERIFIED",
      note: "already_correct",
    });
    expect(m.writes()).toBe(0);
  });

  it("a read-back that doesn't match → FAILED(VERIFY_MISMATCH)", async () => {
    const m = memory({ driftAfterWrite: true });
    const a = await approved(hours("09:00", "17:00"));
    expect(await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter))).toEqual({
      status: "FAILED",
      code: "VERIFY_MISMATCH",
    });
    expect((await ledger.getAction(a.id))?.failureCode).toBe("VERIFY_MISMATCH");
  });

  it("provider still reviewing → long verify, then VERIFY_TIMEOUT after 72h", async () => {
    const m = memory({ pending: true });
    const a = await approved(hours("08:00", "16:00"));
    const { step, events } = fakeStep();
    expect(await exec.executeApprovedAction(data(a.id), step, resolver(m.adapter))).toEqual({ status: "VERIFY_LATER" });
    expect(events).toEqual([{ name: "kob/action.verify.later", data: { actionId: a.id } }]);
    expect((await ledger.getAction(a.id))?.status).toBe("VERIFYING");

    const soon = await exec.verifyPending(new Date(Date.now() + 3_600_000), resolver(m.adapter));
    expect(soon.stillPending).toBeGreaterThanOrEqual(1);
    await exec.verifyPending(new Date(Date.now() + 73 * 3_600_000), resolver(m.adapter));
    expect((await ledger.getAction(a.id))?.failureCode).toBe("VERIFY_TIMEOUT");
  });

  it("AUTH errors are not retried and fail the action", async () => {
    const m = memory({ failExecute: "AUTH" });
    const a = await approved(hours("07:00", "15:00"));
    const err = await exec.executeApprovedAction(data(a.id), fakeStep().step, resolver(m.adapter)).catch((e) => e);
    expect(err).toBeInstanceOf(NonRetriableError);
    await exec.failAfterRetries(a.id, err);
    expect(await ledger.getAction(a.id)).toMatchObject({ status: "FAILED", failureCode: "AUTH" });
  });

  it("no adapter for the connector is a non-retriable failure", async () => {
    const a = await approved(hours("06:00", "14:00"));
    await expect(exec.executeApprovedAction(data(a.id), fakeStep().step, () => null)).rejects.toBeInstanceOf(NonRetriableError);
  });

  it("owner hits Stop during the cool-off → nothing is written", async () => {
    const m = memory();
    const a = await approved(hours("05:00", "13:00"));
    await prisma.osAction.update({ where: { id: a.id }, data: { nextAttemptAt: new Date(Date.now() + 60_000) } });
    const { step } = fakeStep(async () => {
      await ledger.fail(a.id, "STOPPED", "Owner stopped it");
    });
    expect(await exec.executeApprovedAction(data(a.id), step, resolver(m.adapter))).toEqual({ cancelled: true });
    expect(m.writes()).toBe(0);
  });

  it("a verified undo marks the original ROLLED_BACK", async () => {
    const m = memory();
    const original = await approved(hours("12:30", "22:30"));
    await exec.executeApprovedAction(data(original.id), fakeStep().step, resolver(m.adapter));
    const inverse = await approved(hours("12:00", "22:00"), {
      evidence: [{ type: "rollback.of", source: "ledger", sourceId: original.id }],
    });
    expect(await exec.executeApprovedAction(data(inverse.id), fakeStep().step, resolver(m.adapter))).toEqual({ status: "VERIFIED" });
    expect((await ledger.getAction(original.id))?.status).toBe("ROLLED_BACK");
  });
});
