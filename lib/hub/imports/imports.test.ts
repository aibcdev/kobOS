import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const file = (f: string) => readFileSync(`lib/hub/imports/fixtures/${f}`);

describeDb("import framework on Postgres (T-86)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let pipeline: typeof import("@/lib/hub/imports/pipeline");
  let inbound: typeof import("@/lib/hub/imports/inbound");
  let storage: ReturnType<typeof import("@/lib/hub/imports/storage").memoryStorage>;
  let restaurantId: string;

  const upload = (filename: string, body = file(filename), origin: "UPLOAD" | "EMAIL" = "UPLOAD") => pipeline.createImport({ restaurantId, filename, body, origin });
  const snapshots = async () =>
    (await prisma.salesSnapshot.findMany({ where: { restaurantId }, orderBy: [{ date: "asc" }] })).map((s) => [s.date.toISOString().slice(0, 10), s.source, s.revenueCents, s.orderCount]);

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    pipeline = await import("@/lib/hub/imports/pipeline");
    inbound = await import("@/lib/hub/imports/inbound");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "Europe/London", countryCode: "GB" } });
  });
  afterAll(async () => {
    (await import("@/lib/hub/imports/storage")).setImportStorage(null);
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    const s = await import("@/lib/hub/imports/storage");
    storage = s.memoryStorage();
    s.setImportStorage(storage);
    vi.stubEnv("IMPORT_INBOUND_SECRET", "test-inbound-secret");
    for (const t of ["order", "booking", "guest", "importJob", "salesSnapshot"] as const) {
      await (prisma[t] as unknown as { deleteMany(a: unknown): Promise<unknown> }).deleteMany({ where: { restaurantId } });
    }
  });
  afterEach(() => vi.unstubAllEnvs());

  it("stores privately, dedupes the same file, rejects what it can't read", async () => {
    const first = await upload("deliveroo-statement.csv");
    expect(first.duplicate).toBe(false);
    expect(first.job).toMatchObject({ status: "PENDING", source: "AUTO", origin: "UPLOAD" });
    expect([...storage.files.keys()]).toEqual([`${restaurantId}/${first.job.fileSha256}.csv`]);
    const again = await upload("renamed.csv", file("deliveroo-statement.csv"));
    expect(again).toMatchObject({ duplicate: true, job: { id: first.job.id } });
    await expect(upload("photo.jpg", Buffer.from("x"))).rejects.toMatchObject({ code: "UNSUPPORTED" });
    await expect(upload("empty.csv", Buffer.alloc(0))).rejects.toMatchObject({ code: "EMPTY" });
  });

  it("imports a delivery statement with provenance, a period, and per-row errors; undo removes it all", async () => {
    const { job } = await upload("deliveroo-statement.csv");
    const done = await pipeline.runImport(job.id);
    expect(done).toMatchObject({ status: "IMPORTED", source: "DELIVEROO_CSV", rowsTotal: 5, rowsImported: 4, rowsSkipped: 1 });
    expect(done.errorsJson).toEqual([{ row: 6, message: "Couldn't read the date" }]);
    expect([done.periodStart?.toISOString(), done.periodEnd?.toISOString()]).toEqual(["2026-10-14T18:42:00.000Z", "2026-10-15T11:30:00.000Z"]);

    const orders = await prisma.order.findMany({ where: { restaurantId }, orderBy: { placedAt: "asc" } });
    expect(orders.every((o) => o.sourceKind === "FILE_IMPORT" && o.sourceProvider === "DELIVEROO_CSV" && o.sourceImportJobId === job.id && o.channel === "DELIVERY")).toBe(true);
    const { sourceRefFromRow, sourceLabel } = await import("@/lib/hub/source-ref");
    expect(sourceLabel({ ...sourceRefFromRow(orders[0]), importedAt: job.createdAt }, "Europe/London")).toMatch(/^From Deliveroo statement CSV \(uploaded \d+ \w+\)$/);
    expect(await snapshots()).toEqual([
      ["2026-10-14", "IMPORT", 3850, 2],
      ["2026-10-15", "IMPORT", -600, 0],
    ]);

    // Re-running is a no-op; undo clears rows, snapshots and the stored file.
    expect((await pipeline.runImport(job.id)).rowsImported).toBe(4);
    await pipeline.deleteImport(job.id);
    expect(await prisma.order.count({ where: { restaurantId } })).toBe(0);
    expect(await snapshots()).toEqual([]);
    expect(storage.files.size).toBe(0);
  });

  it("asks the owner to match columns it can't recognise, then imports with their mapping", async () => {
    const { job } = await upload("odd-sales.csv");
    const paused = await pipeline.runImport(job.id);
    expect(paused.status).toBe("NEEDS_MAPPING");
    const { importView } = await import("@/lib/hub/imports/access");
    const view = importView(paused);
    expect(view.mapping).toMatchObject({ headers: ["When", "Takings", "Note"], missing: [{ key: "date" }, { key: "total" }] });
    expect(view).not.toHaveProperty("storagePath");

    await pipeline.saveMapping(job.id, { date: "When", total: "Takings", tip: "Not a header" });
    const done = await pipeline.runImport(job.id);
    expect(done).toMatchObject({ status: "IMPORTED", source: "GENERIC_SALES_CSV", rowsImported: 2 });
    expect((done.mappingJson as { mapping: unknown }).mapping).toEqual({ date: "When", total: "Takings" });
    expect(await snapshots()).toEqual([
      ["2026-10-14", "IMPORT", 123450, 1],
      ["2026-10-15", "IMPORT", 9900, 1],
    ]);
  });

  it("guest lists create guests and consent records; bookings link to the same guests", async () => {
    const guests = await pipeline.runImport((await upload("guest-list.csv")).job.id);
    expect(guests).toMatchObject({ status: "IMPORTED", source: "GUESTS_CSV", rowsImported: 2, rowsSkipped: 1 });
    const consents = await prisma.guestConsent.findMany({ where: { restaurantId }, orderBy: { channel: "asc" } });
    expect(consents.map((c) => [c.channel, c.purpose, c.status, c.sourceKind, c.sourceProvider, c.sourceImportJobId])).toEqual([
      ["EMAIL", "MARKETING", "GRANTED", "FILE_IMPORT", "GUESTS_CSV", guests.id],
      ["SMS", "MARKETING", "WITHDRAWN", "FILE_IMPORT", "GUESTS_CSV", guests.id],
    ]);

    const bookings = await pipeline.runImport((await upload("bookings.csv")).job.id);
    expect(bookings).toMatchObject({ status: "IMPORTED", source: "BOOKINGS_CSV", rowsImported: 2, rowsSkipped: 1 });
    const rows = await prisma.booking.findMany({ where: { restaurantId }, orderBy: { startsAt: "asc" }, include: { guest: true } });
    expect(rows.map((b) => [b.sourceExternalId, b.status, b.partySize, b.guest?.displayName ?? null])).toEqual([
      ["R-1", "COMPLETED", 4, "Ada Lovelace"],
      ["R-2", "NO_SHOW", 2, null],
    ]);
    expect(await prisma.guest.count({ where: { restaurantId } })).toBe(2);
  });

  it("keeps PDFs for the parser that will read them", async () => {
    const done = await pipeline.runImport((await upload("acme-invoice.pdf")).job.id);
    expect(done).toMatchObject({ status: "STORED", source: "INVOICE_PDF", rowsImported: 0 });
  });

  it("routes inbound email by tokenised address and ignores forged ones", async () => {
    const data = inbound.inboundAddress(restaurantId, "data");
    expect(data).toMatch(new RegExp(`^data\\+${restaurantId}\\.[a-z0-9]{12}@in\\.trykob\\.com$`));
    expect(inbound.parseInboundAddress(`Statements <${data.toUpperCase()}>`)).toEqual({ kind: "data", restaurantId });
    expect(inbound.parseInboundAddress(data.replace(/\.[a-z0-9]{12}@/, ".aaaaaaaaaaaa@"))).toBeNull();
    expect(inbound.parseInboundAddress(data.replace("in.trykob.com", "evil.com"))).toBeNull();
    expect(inbound.parseInboundAddress(`other+${restaurantId}.x@in.trykob.com`)).toBeNull();

    const res = await inbound.handleInboundEmail({
      to: ["someone@else.com", inbound.inboundAddress(restaurantId, "invoices")],
      attachments: [
        { filename: "acme-invoice.pdf", content: file("acme-invoice.pdf") },
        { filename: "deliveroo-statement.csv", content: file("deliveroo-statement.csv") },
        { filename: "logo.png", content: Buffer.from("png") },
      ],
    });
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ restaurantId, duplicates: 0, rejected: [{ filename: "logo.png" }] });
    const jobs = await prisma.importJob.findMany({ where: { id: { in: res[0].jobIds } }, orderBy: { source: "asc" } });
    expect(jobs.map((j) => [j.origin, j.source])).toEqual([
      ["EMAIL", "AUTO"],
      ["EMAIL", "INVOICE_PDF"],
    ]);
    const statement = await pipeline.runImport(jobs[0].id);
    expect(statement.source).toBe("DELIVEROO_CSV");
    expect(await prisma.order.count({ where: { restaurantId, sourceKind: "EMAIL_INGEST" } })).toBe(4);

    // A retried delivery re-queues jobs that never ran, and counts the rest as duplicates.
    const retry = await inbound.handleInboundEmail({
      to: [inbound.inboundAddress(restaurantId, "invoices")],
      attachments: [
        { filename: "acme-invoice.pdf", content: file("acme-invoice.pdf") },
        { filename: "deliveroo-statement.csv", content: file("deliveroo-statement.csv") },
      ],
    });
    expect(retry[0]).toMatchObject({ jobIds: [jobs[1].id], duplicates: 1 });
  });
});
