import { createHash } from "node:crypto";
import type { ImportJob, Prisma } from "@prisma/client";
import { ingestBookings, ingestOrders } from "@/lib/commerce/ingest";
import { rebuildSalesSnapshots } from "@/lib/commerce/sales-snapshot";
import { recomputeGuestStats, resolveGuest } from "@/lib/commerce/guests";
import { restaurantContext } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";
import { csvRecords } from "@/lib/hub/imports/csv";
import {
  autoMapping,
  CONSENT_FIELDS,
  detectSource,
  importSource,
  mapRecords,
  missingFields,
  type ConsentChannel,
  type ConsentField,
  type Mapping,
} from "@/lib/hub/imports/sources";
import { importStorage } from "@/lib/hub/imports/storage";

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const ALLOWED = /\.(csv|tsv|txt|pdf)$/i;
/** ImportJob.source before detection has run. */
export const AUTO_SOURCE = "AUTO";

export class ImportError extends Error {
  constructor(
    readonly code: "TOO_LARGE" | "UNSUPPORTED" | "EMPTY",
    message: string,
  ) {
    super(message);
  }
}

export type CreateImportInput = {
  restaurantId: string;
  filename: string;
  contentType?: string;
  body: Buffer;
  origin: "UPLOAD" | "EMAIL" | "WHATSAPP";
  /** Source the file must be (inbound bookings+/invoices+ address); otherwise detected from the content. */
  hint?: string | null;
};

export type ImportMappingState = { headers: string[]; mapping: Mapping; missing: { key: string; label: string }[] };

/** Stores the file privately and creates the job; the same file twice returns the first job (`duplicate`). */
export async function createImport(input: CreateImportInput): Promise<{ job: ImportJob; duplicate: boolean }> {
  if (!input.body.length) throw new ImportError("EMPTY", "That file is empty");
  if (input.body.length > MAX_IMPORT_BYTES) throw new ImportError("TOO_LARGE", "Files up to 20 MB, please");
  if (!ALLOWED.test(input.filename)) throw new ImportError("UNSUPPORTED", "KOB reads CSV exports and PDF statements or invoices");

  const fileSha256 = createHash("sha256").update(input.body).digest("hex");
  const existing = await prisma.importJob.findUnique({ where: { restaurantId_fileSha256: { restaurantId: input.restaurantId, fileSha256 } } });
  if (existing) return { job: existing, duplicate: true };

  const ext = input.filename.match(ALLOWED)![1].toLowerCase();
  const storagePath = `${input.restaurantId}/${fileSha256}.${ext}`;
  await importStorage().put(storagePath, input.body, input.contentType || (ext === "pdf" ? "application/pdf" : "text/csv"));
  try {
    const job = await prisma.importJob.create({
      data: {
        restaurantId: input.restaurantId,
        source: input.hint && importSource(input.hint) ? input.hint : AUTO_SOURCE,
        origin: input.origin,
        storagePath,
        fileSha256,
        mappingJson: { filename: input.filename.slice(0, 200) },
      },
    });
    return { job, duplicate: false };
  } catch (e) {
    // Two uploads of the same file racing: the loser returns the winner's job.
    const raced = await prisma.importJob.findUnique({ where: { restaurantId_fileSha256: { restaurantId: input.restaurantId, fileSha256 } } });
    if (raced) return { job: raced, duplicate: true };
    throw e;
  }
}

function decode(body: Buffer): string {
  const utf8 = body.toString("utf8");
  // Excel "CSV" exports are often Windows-1252; latin1 is close enough for headers, names and amounts.
  return utf8.includes("\uFFFD") ? body.toString("latin1") : utf8;
}

function meta(job: ImportJob): Record<string, unknown> {
  return job.mappingJson && typeof job.mappingJson === "object" && !Array.isArray(job.mappingJson) ? (job.mappingJson as Record<string, unknown>) : {};
}

export function filenameOf(job: ImportJob): string {
  return typeof meta(job).filename === "string" ? (meta(job).filename as string) : "file";
}

export function mappingStateOf(job: ImportJob): ImportMappingState | null {
  const m = meta(job);
  return Array.isArray(m.headers) ? { headers: m.headers as string[], mapping: (m.mapping ?? {}) as Mapping, missing: (m.missing ?? []) as ImportMappingState["missing"] } : null;
}

/**
 * Parses and ingests one job. Ends IMPORTED, NEEDS_MAPPING (a required column couldn't be matched; the owner picks it),
 * STORED (a PDF kept for the parser that reads it), or FAILED.
 */
export async function runImport(jobId: string, opts: { mapping?: Mapping } = {}): Promise<ImportJob> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === "IMPORTED") return job;
  await prisma.importJob.update({ where: { id: job.id }, data: { status: "PARSING" } });
  const filename = filenameOf(job);

  try {
    const body = await importStorage().get(job.storagePath);
    const isPdf = /\.pdf$/i.test(job.storagePath);
    const { headers, records } = isPdf ? { headers: [], records: [] } : csvRecords(decode(body));
    const spec = detectSource(filename, headers, job.source === AUTO_SOURCE ? null : job.source);

    if (spec.kind === "FILE_ONLY") {
      return prisma.importJob.update({ where: { id: job.id }, data: { status: "STORED", source: spec.source, errorsJson: [] } });
    }
    if (!headers.length) {
      return prisma.importJob.update({ where: { id: job.id }, data: { status: "FAILED", source: spec.source, errorsJson: [{ row: 0, message: "No header row found" }] } });
    }

    const saved = mappingStateOf(job)?.mapping;
    const mapping = opts.mapping ?? (saved && Object.keys(saved).length ? saved : autoMapping(spec, headers));
    const missing = missingFields(spec, mapping);
    if (missing.length) {
      return prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "NEEDS_MAPPING",
          source: spec.source,
          rowsTotal: records.length,
          mappingJson: { filename, headers, mapping, missing: missing.map(({ key, label }) => ({ key, label })) },
        },
      });
    }

    // Emailed files carrying guest details wait for the owner: anyone who learns the address could send one.
    if (job.origin === "EMAIL" && (spec.kind === "GUESTS" || spec.kind === "BOOKINGS") && !meta(job).reviewedByUserId) {
      return prisma.importJob.update({
        where: { id: job.id },
        data: { status: "NEEDS_REVIEW", source: spec.source, rowsTotal: records.length, mappingJson: { ...meta(job), filename, headers, mapping, missing: [] } as Prisma.InputJsonValue },
      });
    }

    const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: job.restaurantId }, select: { countryCode: true } });
    const { timezone, currency } = await restaurantContext(job.restaurantId);
    const rows = mapRecords(records, {
      spec,
      mapping,
      timezone,
      currency,
      monthFirst: r.countryCode?.toUpperCase() === "US",
      importJobId: job.id,
      sourceKind: job.origin === "EMAIL" ? "EMAIL_INGEST" : "FILE_IMPORT",
    });

    if (rows.orders.length) await ingestOrders(job.restaurantId, rows.orders);
    if (rows.bookings.length) await ingestBookings(job.restaurantId, rows.bookings);
    const consent = rows.guests.length ? await importGuests(job, spec.source, mapping, rows.guests) : {};

    const dates = [...rows.orders.map((o) => o.placedAt), ...rows.bookings.map((b) => b.startsAt)].sort((a, b) => a.getTime() - b.getTime());
    return prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "IMPORTED",
        source: spec.source,
        rowsTotal: records.length,
        rowsImported: rows.orders.length + rows.bookings.length + rows.guests.length,
        rowsSkipped: rows.skipped,
        errorsJson: rows.errors as Prisma.InputJsonValue,
        periodStart: dates[0] ?? null,
        periodEnd: dates[dates.length - 1] ?? null,
        mappingJson: { ...meta(job), filename, headers, mapping, missing: [], consent } as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 300) : "Import failed";
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "FAILED", errorsJson: [{ row: 0, message }] } });
    throw e;
  }
}

export type ConsentSummary = Partial<Record<ConsentField, { column: string; channel: ConsentChannel | null; pending: number; attested?: { channel: ConsentChannel; at: string } }>>;

/**
 * Guest lists carry opt-in columns, but a "yes" in an export isn't consent to this restaurant's marketing until the
 * owner says so (an OpenTable opt-in is often OpenTable's own). Opt-ins land UNKNOWN for attestation; opt-outs are
 * recorded WITHDRAWN at once, on the stated channel or on every channel when the column doesn't say.
 */
async function importGuests(job: ImportJob, source: string, mapping: Mapping, guests: ReturnType<typeof mapRecords>["guests"]): Promise<ConsentSummary> {
  const sourceKind = job.origin === "EMAIL" ? "EMAIL_INGEST" : "FILE_IMPORT";
  const now = new Date();
  const summary: ConsentSummary = {};
  for (const g of guests) {
    await prisma.$transaction(async (tx) => {
      const guestId = await resolveGuest(tx, job.restaurantId, g);
      if (!guestId) return;
      for (const c of g.consent) {
        const stated = CONSENT_FIELDS[c.field];
        const channels: string[] = c.value ? [stated ?? "UNSPECIFIED"] : stated ? [stated] : ["EMAIL", "SMS", "WHATSAPP"];
        for (const channel of channels) {
          await tx.guestConsent.create({
            data: {
              restaurantId: job.restaurantId,
              guestId,
              channel,
              purpose: "MARKETING",
              status: c.value ? "UNKNOWN" : "WITHDRAWN",
              capturedAt: now,
              sourceKind,
              sourceProvider: source,
              sourceExternalId: g.rowId,
              sourceImportJobId: job.id,
              evidenceJson: { field: c.field, column: mapping[c.field] ?? null, value: c.raw, importedFrom: filenameOf(job) },
            },
          });
        }
        if (c.value) {
          const s = (summary[c.field] ??= { column: mapping[c.field] ?? c.field, channel: stated, pending: 0 });
          s.pending += 1;
        }
      }
    });
  }
  return summary;
}

export function consentSummaryOf(job: ImportJob): ConsentSummary {
  const c = meta(job).consent;
  return c && typeof c === "object" && !Array.isArray(c) ? (c as ConsentSummary) : {};
}

/** Owner allowed an emailed guest/bookings file in: re-run it without the review hold. */
export async function approveEmailedImport(jobId: string, userId: string): Promise<ImportJob> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  return prisma.importJob.update({
    where: { id: job.id },
    data: { status: "PENDING", mappingJson: { ...meta(job), reviewedByUserId: userId, reviewedAt: new Date().toISOString() } as Prisma.InputJsonValue },
  });
}

/** Owner picked the missing columns: keep only real headers, save, and put the job back to PENDING for a re-run. */
export async function saveMapping(jobId: string, mapping: Mapping): Promise<ImportJob> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const headers = new Set(mappingStateOf(job)?.headers ?? []);
  const clean = Object.fromEntries(Object.entries(mapping).filter(([, h]) => headers.has(h)));
  return prisma.importJob.update({ where: { id: job.id }, data: { status: "PENDING", mappingJson: { ...meta(job), mapping: clean } as Prisma.InputJsonValue } });
}

/** Undo: removes everything the import wrote, the stored file and the job, then rebuilds the affected sales days. */
export async function deleteImport(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const touched = await prisma.order.findMany({ where: { sourceImportJobId: job.id }, select: { guestId: true } });
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { restaurantId: job.restaurantId, sourceImportJobId: job.id } }),
    prisma.booking.deleteMany({ where: { restaurantId: job.restaurantId, sourceImportJobId: job.id } }),
    prisma.guestConsent.deleteMany({ where: { restaurantId: job.restaurantId, sourceImportJobId: job.id } }),
    prisma.importJob.delete({ where: { id: job.id } }),
  ]);
  await importStorage().remove([job.storagePath]);
  await recomputeGuestStats(touched.map((t) => t.guestId).filter((g): g is string => !!g));
  if (job.periodStart && job.periodEnd) await rebuildSalesSnapshots(job.restaurantId, job.periodStart, job.periodEnd, ["IMPORT"]);
}
