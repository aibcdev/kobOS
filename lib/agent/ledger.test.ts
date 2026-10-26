import type { OsActionStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ACTION_TYPES, riskFor } from "@/lib/agent/action-types";
import { canTransition, TERMINAL, TRANSITIONS } from "@/lib/agent/ledger";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const HAPPY: OsActionStatus[] = [
  "DETECTED",
  "PROPOSED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "EXECUTED",
  "VERIFYING",
  "VERIFIED",
];

describe("transition table", () => {
  it("allows the happy path one step at a time", () => {
    for (let i = 0; i < HAPPY.length - 1; i++) expect(canTransition(HAPPY[i], HAPPY[i + 1])).toBe(true);
  });

  it("refuses skips and reversals", () => {
    expect(canTransition("AWAITING_APPROVAL", "EXECUTING")).toBe(false);
    expect(canTransition("APPROVED", "VERIFIED")).toBe(false);
    expect(canTransition("VERIFIED", "EXECUTING")).toBe(false);
    expect(canTransition("REJECTED", "APPROVED")).toBe(false);
  });

  it("terminal states only allow undo of a verified action", () => {
    for (const s of TERMINAL) expect(TRANSITIONS[s].filter((t) => t !== "ROLLED_BACK")).toEqual([]);
  });

  it("an approved action can be posted by the owner, and that is final", () => {
    expect(canTransition("APPROVED", "DONE_BY_OWNER")).toBe(true);
    expect(canTransition("AWAITING_APPROVAL", "DONE_BY_OWNER")).toBe(false);
    expect(canTransition("EXECUTING", "DONE_BY_OWNER")).toBe(false);
    expect(TERMINAL).toContain("DONE_BY_OWNER");
    expect(TRANSITIONS.DONE_BY_OWNER).toEqual([]);
  });

  it("scores risk from the registry (spec examples)", () => {
    expect(riskFor("gbp.review.reply")).toBe(18);
    expect(riskFor("gbp.hours.regular.update")).toBe(39);
    expect(ACTION_TYPES).toHaveLength(15);
  });
});

const reply = (reviewId: string, replyText = "Thanks so much for coming in!") => ({
  actionType: "gbp.review.reply",
  reviewId,
  replyText,
});

describeDb("ledger on Postgres", () => {
  let ledger: typeof import("@/lib/agent/ledger");
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;

  beforeAll(async () => {
    ledger = await import("@/lib/agent/ledger");
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  const kinds = async (actionId: string) =>
    (await prisma.osAuditEvent.findMany({ where: { actionId }, orderBy: { createdAt: "asc" } })).map((e) => e.kind);

  it("createProposal lands in AWAITING_APPROVAL with risk, connector and expiry", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "Reply to Sam", payload: reply("r1") });
    expect(a.status).toBe("AWAITING_APPROVAL");
    expect(a.connector).toBe("GBP");
    expect(a.riskScore).toBe(18);
    expect(a.expiresAt!.getTime() - a.createdAt.getTime()).toBeGreaterThan(6 * 24 * 3_600_000);
    expect(await kinds(a.id)).toEqual(["action.proposed"]);
  });

  it("a duplicate proposal returns the same row", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "Reply", payload: reply("r2") });
    const b = await ledger.createProposal({ restaurantId, title: "Reply again", payload: reply("r2") });
    expect(b.id).toBe(a.id);
    const c = await ledger.createProposal({ restaurantId, title: "Different text", payload: reply("r2", "Other words") });
    expect(c.id).not.toBe(a.id);
  });

  it("rejects an invalid payload", async () => {
    await expect(
      ledger.createProposal({ restaurantId, title: "x", payload: { actionType: "gbp.review.reply", reviewId: "r" } }),
    ).rejects.toThrow();
  });

  it("an illegal transition throws LedgerTransitionError", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "x", payload: reply("r3") });
    await expect(ledger.markExecuted(a.id, {})).rejects.toBeInstanceOf(ledger.LedgerTransitionError);
    await expect(ledger.claim(a.id)).resolves.toBeNull();
  });

  it("walks to VERIFIED, auditing every step; a second claim gets null", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "x", payload: reply("r4") });
    await ledger.approve(a.id, "owner");
    expect((await ledger.approve(a.id, "owner")).status).toBe("APPROVED");
    const claimed = await ledger.claim(a.id);
    expect(claimed?.status).toBe("EXECUTING");
    expect(await ledger.claim(a.id)).toBeNull();
    await ledger.markExecuted(a.id, { ok: true });
    await ledger.markVerifying(a.id);
    const done = await ledger.markVerified(a.id, { comment: "Thanks so much for coming in!" });
    expect(done.status).toBe("VERIFIED");
    expect(done.undoUntil).not.toBeNull();
    expect(await kinds(a.id)).toEqual([
      "action.proposed",
      "action.approved",
      "action.executing",
      "action.executed",
      "action.verifying",
      "action.verified",
    ]);
  });

  it("assisted: approve → posted by owner, kept apart from VERIFIED; saying it twice is a no-op", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "x", payload: reply("kob-review:r6") });
    await expect(ledger.markDoneByOwner(a.id, "owner")).rejects.toBeInstanceOf(ledger.LedgerTransitionError);
    await ledger.approve(a.id, "owner");
    const done = await ledger.markDoneByOwner(a.id, "owner");
    expect(done.status).toBe("DONE_BY_OWNER");
    expect(done.executionCompletedAt).not.toBeNull();
    expect((await ledger.markDoneByOwner(a.id, "owner")).status).toBe("DONE_BY_OWNER");
    expect(await kinds(a.id)).toEqual(["action.proposed", "action.approved", "action.done_by_owner"]);
    expect(await ledger.claim(a.id)).toBeNull();
  });

  it("the owner's edit replaces the drafted words only while it waits", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "x", payload: reply("kob-review:r7") });
    const edited = await ledger.editProposalText(a.id, "owner", "  Thank you, Sam!  ");
    expect((edited.proposedPayload as { replyText: string }).replyText).toBe("Thank you, Sam!");
    await ledger.approve(a.id, "owner");
    await expect(ledger.editProposalText(a.id, "owner", "Too late")).rejects.toBeInstanceOf(ledger.LedgerTransitionError);
  });

  it("reject is terminal and can't be approved afterwards", async () => {
    const a = await ledger.createProposal({ restaurantId, title: "x", payload: reply("r5") });
    await ledger.reject(a.id, "owner", "wrong tone");
    expect(await ledger.isCancelled(a.id)).toBe(true);
    await expect(ledger.approve(a.id, "owner")).rejects.toBeInstanceOf(ledger.LedgerTransitionError);
  });
});
