import { providerName } from "@/lib/hub/capabilities";

/** Spec 2 §3.6. Every fact row carries one; every figure shown to an owner renders at least one. */
export const SOURCE_KINDS = ["API", "WEBHOOK", "FILE_IMPORT", "EMAIL_INGEST", "OWNER_ENTERED"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export type SourceRef = {
  kind: SourceKind;
  /** SQUARE, TOAST, DELIVEROO_CSV … */
  provider: string;
  externalId: string;
  importJobId?: string | null;
  /** What the row is, for the label: "order", "booking", "invoice", "statement" … */
  noun?: string;
  /** When the source event happened (order placed, call ended). */
  occurredAt?: Date | string | null;
  /** FILE_IMPORT / EMAIL_INGEST: when the file arrived. */
  importedAt?: Date | string | null;
};

/** Columns on fact rows (Order, Booking, …) → SourceRef. */
export function sourceRefFromRow(row: {
  sourceKind: string;
  sourceProvider: string;
  sourceExternalId: string;
  sourceImportJobId?: string | null;
}): SourceRef {
  const kind = (SOURCE_KINDS as readonly string[]).includes(row.sourceKind) ? (row.sourceKind as SourceKind) : "API";
  return { kind, provider: row.sourceProvider, externalId: row.sourceExternalId, importJobId: row.sourceImportJobId ?? null };
}

const IMPORT_SUFFIX = /_(CSV|XLSX|PDF|EMAIL)$/;

/** "Deliveroo statement CSV" from DELIVEROO_CSV; "Square" from SQUARE. */
function sourceName(provider: string): { name: string; format: string | null } {
  const m = provider.match(IMPORT_SUFFIX);
  if (!m) return { name: providerName(provider), format: null };
  return { name: providerName(provider.slice(0, -m[0].length)), format: m[1] };
}

/** Short external id: Square order ids are long; owners recognise the first few characters on the receipt. */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 4).toUpperCase() : id;
}

/**
 * Owner-facing provenance chip text:
 *   "From Square order #A12F · 14 Oct 19:42"
 *   "From Deliveroo statement CSV (uploaded 13 Oct)"
 */
export function sourceLabel(ref: SourceRef, timeZone = "Europe/London", locale = "en-GB"): string {
  const day = new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const { name, format } = sourceName(ref.provider);

  if (ref.kind === "FILE_IMPORT" || ref.kind === "EMAIL_INGEST") {
    const what = `${name} ${ref.noun ?? "statement"}${format ? ` ${format}` : ""}`;
    const verb = ref.kind === "EMAIL_INGEST" ? "emailed" : "uploaded";
    return ref.importedAt ? `From ${what} (${verb} ${day.format(new Date(ref.importedAt))})` : `From ${what}`;
  }
  if (ref.kind === "OWNER_ENTERED") return "Entered by you";
  const head = `From ${name} ${ref.noun ?? "record"} #${shortId(ref.externalId)}`;
  if (!ref.occurredAt) return head;
  const at = new Date(ref.occurredAt);
  return `${head} · ${day.format(at)} ${time.format(at)}`;
}
