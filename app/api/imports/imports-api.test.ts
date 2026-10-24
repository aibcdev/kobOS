import { readFileSync } from "node:fs";
import { Webhook } from "svix";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const state = vi.hoisted(() => ({ userId: null as string | null, send: vi.fn() }));
vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () => (state.userId ? { ok: true, userId: state.userId } : { ok: false, status: 401, message: "Unauthorized" }),
}));
vi.mock("@/inngest/client", () => ({ inngest: { send: state.send, createFunction: () => ({}) } }));

const ORIGIN = "https://trykob.com";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function uploadReq(restaurantId: string, filename: string, body: Buffer, origin: string | null = ORIGIN) {
  const form = new FormData();
  form.set("restaurantId", restaurantId);
  form.set("file", new File([new Uint8Array(body)], filename, { type: "text/csv" }));
  return new Request(`${ORIGIN}/api/imports`, { method: "POST", body: form, headers: origin ? { origin } : {} });
}

describe("inbound email webhook", () => {
  const secret = `whsec_${Buffer.from("inbound-test-secret-32-bytes-long!").toString("base64")}`;
  const signed = (payload: unknown, s = secret) => {
    const raw = JSON.stringify(payload);
    const id = `msg_${Math.random().toString(36).slice(2)}`;
    const ts = new Date();
    return new Request(`${ORIGIN}/api/inbound/email`, {
      method: "POST",
      body: raw,
      headers: { "svix-id": id, "svix-timestamp": String(Math.floor(ts.getTime() / 1000)), "svix-signature": new Webhook(s).sign(id, ts, raw) },
    });
  };

  beforeEach(() => {
    state.send.mockReset();
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", secret);
    vi.stubEnv("IMPORT_INBOUND_SECRET", "test-inbound-secret");
  });

  it("verifies the signature and queues only KOB import addresses", async () => {
    const { POST } = await import("@/app/api/inbound/email/route");
    const { inboundAddress } = await import("@/lib/hub/imports/inbound");
    const to = inboundAddress("clrest0123abcd", "data");
    const ok = await POST(signed({ type: "email.received", data: { email_id: "em_1", to: ["hello@trykob.com", to] } }));
    expect(ok.status).toBe(200);
    expect(state.send).toHaveBeenCalledWith({ id: "inbound-em_1", name: "hub/inbound-email.received", data: { emailId: "em_1", to: [to] } });

    const other = await POST(signed({ type: "email.received", data: { email_id: "em_2", to: ["hello@trykob.com"] } }));
    expect(await other.json()).toEqual({ ignored: true });
    const forged = await POST(signed({ type: "email.received", data: { email_id: "em_3", to: [to] } }, `whsec_${Buffer.from("some-other-secret-32-bytes-long!!!").toString("base64")}`));
    expect(forged.status).toBe(401);
    expect(state.send).toHaveBeenCalledTimes(1);
  });

  it("is unavailable until configured", async () => {
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", "");
    const { POST } = await import("@/app/api/inbound/email/route");
    expect((await POST(signed({ type: "email.received" }))).status).toBe(503);
  });
});

describeDb("/api/imports on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let own: { restaurantId: string; userId: string };
  let other: { restaurantId: string; userId: string };
  let member: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    (await import("@/lib/hub/imports/storage")).setImportStorage((await import("@/lib/hub/imports/storage")).memoryStorage());
    const a = await seedRestaurant(prisma);
    const b = await seedRestaurant(prisma);
    own = { restaurantId: a.restaurant.id, userId: a.userId };
    other = { restaurantId: b.restaurant.id, userId: b.userId };
    member = (await seedRestaurant(prisma)).userId;
    await prisma.teamMember.create({ data: { userId: member, restaurantId: own.restaurantId, role: "MEMBER" } });
  });
  afterAll(async () => {
    (await import("@/lib/hub/imports/storage")).setImportStorage(null);
    await prisma.restaurant.deleteMany({ where: { id: { in: [own.restaurantId, other.restaurantId] } } });
    await prisma.$disconnect();
  });
  beforeEach(() => state.send.mockReset());

  it("uploads, queues, dedupes, and keeps tenants apart", async () => {
    const { GET, POST } = await import("@/app/api/imports/route");
    const csv = readFileSync("lib/hub/imports/fixtures/deliveroo-statement.csv");

    state.userId = null;
    expect((await POST(uploadReq(own.restaurantId, "d.csv", csv))).status).toBe(401);
    state.userId = own.userId;
    expect((await POST(uploadReq(own.restaurantId, "d.csv", csv, "https://evil.example"))).status).toBe(403);
    expect((await POST(uploadReq(other.restaurantId, "d.csv", csv))).status).toBe(404);

    const created = await POST(uploadReq(own.restaurantId, "deliveroo.csv", csv));
    expect(created.status).toBe(201);
    const { import: view } = (await created.json()) as { import: { id: string; filename: string; status: string } };
    expect(view).toMatchObject({ filename: "deliveroo.csv", status: "PENDING" });
    expect(view).not.toHaveProperty("storagePath");
    expect(state.send).toHaveBeenCalledWith({ name: "hub/import.created", data: { importJobId: view.id } });

    const bad = await POST(uploadReq(own.restaurantId, "photo.jpg", Buffer.from("x")));
    expect(bad.status).toBe(422);

    const list = await GET(new Request(`${ORIGIN}/api/imports?restaurantId=${own.restaurantId}`));
    expect(((await list.json()) as { imports: unknown[] }).imports).toHaveLength(1);
    state.userId = other.userId;
    expect((await GET(new Request(`${ORIGIN}/api/imports?restaurantId=${own.restaurantId}`))).status).toBe(404);
    const { GET: getOne, DELETE } = await import("@/app/api/imports/[id]/route");
    expect((await getOne(new Request(`${ORIGIN}/api/imports/${view.id}`), params(view.id))).status).toBe(404);

    state.userId = member;
    expect((await DELETE(new Request(`${ORIGIN}/api/imports/${view.id}`, { method: "DELETE", headers: { origin: ORIGIN } }), params(view.id))).status).toBe(403);
    state.userId = own.userId;
    expect((await DELETE(new Request(`${ORIGIN}/api/imports/${view.id}`, { method: "DELETE", headers: { origin: ORIGIN } }), params(view.id))).status).toBe(200);
    expect(await prisma.importJob.count({ where: { restaurantId: own.restaurantId } })).toBe(0);
  });

  it("accepts a column mapping only when the import is waiting for one", async () => {
    const { createImport, runImport } = await import("@/lib/hub/imports/pipeline");
    const { POST } = await import("@/app/api/imports/[id]/mapping/route");
    const { job } = await createImport({ restaurantId: own.restaurantId, filename: "odd.csv", body: readFileSync("lib/hub/imports/fixtures/odd-sales.csv"), origin: "UPLOAD" });
    const post = (body: unknown) => POST(new Request(`${ORIGIN}/api/imports/${job.id}/mapping`, { method: "POST", headers: { origin: ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify(body) }), params(job.id));

    state.userId = own.userId;
    expect((await post({ mapping: { date: "When" } })).status).toBe(409);
    await runImport(job.id);
    const res = await post({ mapping: { date: "When", total: "Takings" } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { import: { status: string } }).import.status).toBe("PENDING");
    expect(state.send).toHaveBeenCalledWith({ name: "hub/import.created", data: { importJobId: job.id } });
  });
});
