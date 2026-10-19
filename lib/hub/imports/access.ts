import type { ImportJob, TeamMember } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { consentSummaryOf, filenameOf, mappingStateOf } from "@/lib/hub/imports/pipeline";
import { importSource, type ConsentChannel } from "@/lib/hub/imports/sources";

/** The job if the user is on its restaurant's team; null otherwise (callers return 404, never 403). */
export async function loadImportForUser(userId: string, id: string): Promise<{ job: ImportJob; member: TeamMember } | null> {
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) return null;
  const member = await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId, restaurantId: job.restaurantId } } });
  return member ? { job, member } : null;
}

export type ImportView = {
  id: string;
  filename: string;
  source: string;
  sourceLabel: string;
  status: string;
  origin: string;
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  errors: { row: number; message: string }[];
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  mapping: { headers: string[]; mapping: Record<string, string>; missing: { key: string; label: string }[]; fields: { key: string; label: string; required: boolean }[] } | null;
  /** Opt-in columns waiting for (or given) owner attestation. */
  consent: { field: string; column: string; channel: ConsentChannel | null; pending: number; attested: { channel: ConsentChannel; at: string } | null }[];
  /** NEEDS_REVIEW: the columns an emailed file has, so the owner can see what it is before letting it in. */
  reviewColumns: string[] | null;
};

/** What the UI and API show: no storage path or file hash. */
export function importView(job: ImportJob): ImportView {
  const spec = importSource(job.source);
  const state = mappingStateOf(job);
  return {
    id: job.id,
    filename: filenameOf(job),
    source: job.source,
    sourceLabel: spec?.label ?? "Detecting…",
    status: job.status,
    origin: job.origin,
    rowsTotal: job.rowsTotal,
    rowsImported: job.rowsImported,
    rowsSkipped: job.rowsSkipped,
    errors: (Array.isArray(job.errorsJson) ? (job.errorsJson as ImportView["errors"]) : []).slice(0, 10),
    periodStart: job.periodStart?.toISOString() ?? null,
    periodEnd: job.periodEnd?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    mapping:
      state && job.status === "NEEDS_MAPPING"
        ? { ...state, fields: (spec?.fields ?? []).map(({ key, label, required }) => ({ key, label, required })) }
        : null,
    consent: Object.entries(consentSummaryOf(job)).map(([field, c]) => ({ field, column: c!.column, channel: c!.channel, pending: c!.pending, attested: c!.attested ?? null })),
    reviewColumns: job.status === "NEEDS_REVIEW" ? (state?.headers ?? []).slice(0, 30) : null,
  };
}
