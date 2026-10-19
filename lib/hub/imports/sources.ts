import type { GuestInput } from "@/lib/commerce/guests";
import type { BookingInput, BookingStatus, OrderChannel, OrderInput, OrderStatus } from "@/lib/commerce/ingest";
import { toMinor } from "@/lib/commerce/money";
import { zonedToUtc } from "@/lib/connectors/shared";
import { parseAmount, parseLocalDateTime } from "@/lib/hub/imports/csv";
import type { SourceKind } from "@/lib/hub/source-ref";
import { createHash } from "node:crypto";

export type ImportKind = "SALES" | "GUESTS" | "BOOKINGS" | "FILE_ONLY";

export type ImportField = { key: string; label: string; required: boolean; aliases: string[] };

export type ImportSourceSpec = {
  /** ImportJob.source and the SourceRef provider (DELIVEROO_CSV → "Deliveroo statement CSV"). */
  source: string;
  label: string;
  kind: ImportKind;
  channel?: OrderChannel;
  /** Filename or header text that identifies the export. */
  signature?: RegExp;
  fields: ImportField[];
};

const SALES_FIELDS = (extra: Partial<Record<string, string[]>> = {}): ImportField[] => [
  { key: "orderId", label: "Order ID", required: false, aliases: ["order id", "order number", "order no", "order ref", "order reference", "doordash order id", "workflow uuid", ...(extra.orderId ?? [])] },
  { key: "date", label: "Date", required: true, aliases: ["date", "order date", "order placed at", "placed at", "delivery date", "timestamp local date", "transaction date", "business date", ...(extra.date ?? [])] },
  { key: "time", label: "Time", required: false, aliases: ["time", "order time", "timestamp local time", "placed time", ...(extra.time ?? [])] },
  { key: "total", label: "Order total", required: true, aliases: ["order total", "total", "order value", "gross sales", "sales incl vat", "sales (incl. vat)", "subtotal", "amount", "sales", "gross", "food sales", ...(extra.total ?? [])] },
  { key: "refund", label: "Refund", required: false, aliases: ["refund", "refunds", "refund amount", "adjustments", "customer refunds", "refunds (incl. vat)", ...(extra.refund ?? [])] },
  { key: "status", label: "Status", required: false, aliases: ["status", "order status", "final order status", ...(extra.status ?? [])] },
  { key: "tip", label: "Tip", required: false, aliases: ["tip", "tips", "gratuity", "dasher tip"] },
  { key: "tax", label: "Tax", required: false, aliases: ["tax", "vat", "sales tax", "tax amount"] },
];

const GUEST_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: false, aliases: ["name", "guest name", "full name", "customer name", "customer"] },
  { key: "firstName", label: "First name", required: false, aliases: ["first name", "firstname", "given name", "forename"] },
  { key: "lastName", label: "Last name", required: false, aliases: ["last name", "lastname", "surname", "family name"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "email address", "e-mail", "guest email"] },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "phone number", "mobile", "telephone", "guest phone", "contact number"] },
  { key: "emailOptIn", label: "Email marketing opt-in", required: false, aliases: ["email opt in", "email marketing", "email marketing opt in", "accepts email marketing", "email subscribed", "email consent"] },
  { key: "smsOptIn", label: "SMS marketing opt-in", required: false, aliases: ["sms opt in", "text opt in", "sms marketing", "accepts sms marketing", "sms consent", "text message opt in"] },
  { key: "whatsappOptIn", label: "WhatsApp marketing opt-in", required: false, aliases: ["whatsapp opt in", "whatsapp marketing", "whatsapp consent"] },
  /** Says nothing about the channel; the owner names it when attesting. */
  { key: "optIn", label: "Marketing opt-in (channel not stated)", required: false, aliases: ["opt in", "opt-in", "marketing opt in", "marketing", "subscribed", "accepts marketing", "restaurant marketing opt in"] },
];

/** Consent columns and the channel each one speaks for (null: the owner must say). */
export const CONSENT_FIELDS = { emailOptIn: "EMAIL", smsOptIn: "SMS", whatsappOptIn: "WHATSAPP", optIn: null } as const;
export type ConsentField = keyof typeof CONSENT_FIELDS;
export type ConsentChannel = "EMAIL" | "SMS" | "WHATSAPP";
const CONSENT_KEYS = Object.keys(CONSENT_FIELDS) as ConsentField[];

const BOOKING_FIELDS: ImportField[] = [
  { key: "bookingId", label: "Booking ID", required: false, aliases: ["booking id", "reservation id", "confirmation number", "booking reference", "reference", "conf #"] },
  { key: "date", label: "Date", required: true, aliases: ["date", "booking date", "reservation date", "visit date"] },
  { key: "time", label: "Time", required: false, aliases: ["time", "booking time", "reservation time"] },
  { key: "partySize", label: "Party size", required: true, aliases: ["party size", "covers", "guests", "size", "pax", "people"] },
  { key: "status", label: "Status", required: false, aliases: ["status", "booking status", "reservation status", "state"] },
  ...GUEST_FIELDS.filter((f) => !(f.key in CONSENT_FIELDS)),
];

export const IMPORT_SOURCES: readonly ImportSourceSpec[] = [
  { source: "DELIVEROO_CSV", label: "Deliveroo statement", kind: "SALES", channel: "DELIVERY", signature: /deliveroo/i, fields: SALES_FIELDS() },
  { source: "UBER_EATS_CSV", label: "Uber Eats payment report", kind: "SALES", channel: "DELIVERY", signature: /uber ?eats|ubereats/i, fields: SALES_FIELDS() },
  { source: "JUST_EAT_CSV", label: "Just Eat statement", kind: "SALES", channel: "DELIVERY", signature: /just ?eat/i, fields: SALES_FIELDS() },
  { source: "DOORDASH_CSV", label: "DoorDash payout report", kind: "SALES", channel: "DELIVERY", signature: /doordash|dasher/i, fields: SALES_FIELDS() },
  { source: "GENERIC_SALES_CSV", label: "Sales export", kind: "SALES", channel: "UNKNOWN", fields: SALES_FIELDS() },
  { source: "GUESTS_CSV", label: "Guest list", kind: "GUESTS", signature: /guest|customer|contacts?|subscribers?/i, fields: GUEST_FIELDS },
  { source: "BOOKINGS_CSV", label: "Bookings export", kind: "BOOKINGS", signature: /booking|reservation|covers/i, fields: BOOKING_FIELDS },
  { source: "INVOICE_PDF", label: "Supplier invoice", kind: "FILE_ONLY", fields: [] },
  { source: "MENU_PDF", label: "Menu", kind: "FILE_ONLY", fields: [] },
];

export function importSource(source: string): ImportSourceSpec | undefined {
  return IMPORT_SOURCES.find((s) => s.source === source);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Mapping = Record<string, string>;

/** Field key → header, best alias match first. */
export function autoMapping(spec: ImportSourceSpec, headers: string[]): Mapping {
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  const used = new Set<string>();
  const out: Mapping = {};
  for (const f of spec.fields) {
    const hit = f.aliases.map((a) => byNorm.get(norm(a))).find((h): h is string => !!h && !used.has(h));
    if (hit) {
      out[f.key] = hit;
      used.add(hit);
    }
  }
  return out;
}

export function missingFields(spec: ImportSourceSpec, mapping: Mapping): ImportField[] {
  const missing = spec.fields.filter((f) => f.required && !mapping[f.key]);
  if (spec.kind === "GUESTS" && !mapping.email && !mapping.phone) {
    missing.push({ key: "email", label: "Email or phone", required: true, aliases: [] });
  }
  return missing;
}

/**
 * Picks the source for a file: an explicit hint (inbound address), a signature match in the filename or headers, then
 * the kind whose required columns map best. PDFs are stored for later parsing.
 */
export function detectSource(filename: string, headers: string[], hint?: string | null): ImportSourceSpec {
  if (hint) {
    const s = importSource(hint);
    if (s) return s;
  }
  if (/\.pdf$/i.test(filename)) return importSource(/menu/i.test(filename) ? "MENU_PDF" : "INVOICE_PDF")!;
  const text = `${filename} ${headers.join(" ")}`;
  const signed = IMPORT_SOURCES.filter((s) => s.signature?.test(text) && s.kind !== "FILE_ONLY");
  const candidates = signed.length ? signed : IMPORT_SOURCES.filter((s) => s.kind !== "FILE_ONLY");
  const score = (s: ImportSourceSpec) => {
    const m = autoMapping(s, headers);
    return Object.keys(m).length - missingFields(s, m).length * 10;
  };
  const best = [...candidates].sort((a, b) => score(b) - score(a))[0];
  // Nothing fits cleanly: most unrecognised files are sales exports, and the owner maps the columns.
  return missingFields(best, autoMapping(best, headers)).length && !signed.length ? importSource("GENERIC_SALES_CSV")! : best;
}

export type RowContext = {
  spec: ImportSourceSpec;
  mapping: Mapping;
  timezone: string;
  currency: string;
  monthFirst: boolean;
  importJobId: string;
  sourceKind: Extract<SourceKind, "FILE_IMPORT" | "EMAIL_INGEST">;
};

export type MappedRows = {
  orders: OrderInput[];
  bookings: BookingInput[];
  guests: (GuestInput & { consent: { field: ConsentField; value: boolean; raw: string }[]; rowId: string })[];
  skipped: number;
  errors: { row: number; message: string }[];
};

function rowId(spec: ImportSourceSpec, explicit: string | undefined, record: Record<string, string>): string {
  if (explicit?.trim()) return explicit.trim();
  // No id column: a content hash keeps re-imports of overlapping statements idempotent.
  return `row:${createHash("sha256").update(spec.source).update(JSON.stringify(Object.values(record))).digest("hex").slice(0, 24)}`;
}

function orderStatus(raw: string | undefined): OrderStatus {
  const s = (raw ?? "").toLowerCase();
  if (/cancel|reject|declin|fail|void/.test(s)) return "CANCELLED";
  if (/refund/.test(s)) return "REFUNDED";
  return "COMPLETED";
}

function bookingStatus(raw: string | undefined): BookingStatus {
  const s = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (/noshow/.test(s)) return "NO_SHOW";
  if (/cancel/.test(s)) return "CANCELLED";
  if (/seated|arrived/.test(s)) return "SEATED";
  if (/complete|finished|done|left|paid/.test(s)) return "COMPLETED";
  return "BOOKED";
}

/** Yes / no for a consent cell; anything else (blank, "unknown", "pending") says nothing. */
const consentValue = (raw: string | undefined): boolean | null => {
  const s = (raw ?? "").trim().toLowerCase();
  if (["y", "yes", "true", "1", "opted in", "opted-in", "subscribed", "x"].includes(s)) return true;
  if (["n", "no", "false", "0", "opted out", "opted-out", "unsubscribed"].includes(s)) return false;
  return null;
};

function guestOf(get: (k: string) => string | undefined, provider: string): GuestInput | null {
  const name = get("name") || [get("firstName"), get("lastName")].filter(Boolean).join(" ");
  const identities: GuestInput["identities"] = [];
  const email = get("email");
  const phone = get("phone");
  if (email && /@/.test(email)) identities.push({ kind: "EMAIL", value: email, provider });
  if (phone && /\d{6,}/.test(phone.replace(/\D/g, ""))) identities.push({ kind: "PHONE", value: phone, provider });
  return identities.length ? { displayName: name?.trim() || null, identities } : null;
}

export function mapRecords(records: Record<string, string>[], ctx: RowContext): MappedRows {
  const out: MappedRows = { orders: [], bookings: [], guests: [], skipped: 0, errors: [] };
  const { spec, mapping } = ctx;
  records.forEach((record, i) => {
    const get = (k: string) => (mapping[k] ? record[mapping[k]]?.trim() || undefined : undefined);
    const fail = (message: string) => {
      out.skipped += 1;
      if (out.errors.length < 50) out.errors.push({ row: i + 2, message });
    };
    const id = rowId(spec, get(spec.kind === "BOOKINGS" ? "bookingId" : "orderId"), record);
    const source = { kind: ctx.sourceKind, provider: spec.source, externalId: id, importJobId: ctx.importJobId };

    if (spec.kind === "SALES") {
      const local = parseLocalDateTime(get("date"), get("time"), ctx.monthFirst);
      const total = parseAmount(get("total"));
      if (!local) return fail("Couldn't read the date");
      if (total == null) return fail("Couldn't read the total");
      const refundAbs = Math.abs(parseAmount(get("refund")) ?? 0);
      let status = orderStatus(get("status"));
      const m = (n: number) => toMinor(n, ctx.currency);
      // A negative line is a refund on its own row.
      const isRefundRow = total < 0;
      if (isRefundRow || refundAbs > 0) status = status === "CANCELLED" ? status : "REFUNDED";
      out.orders.push({
        source,
        status,
        channel: spec.channel ?? "UNKNOWN",
        placedAt: zonedToUtc(local, ctx.timezone),
        currency: ctx.currency,
        totalMinor: isRefundRow ? 0 : m(total),
        refundedMinor: isRefundRow ? m(Math.abs(total)) : status === "REFUNDED" && !refundAbs ? m(total) : m(refundAbs),
        tipMinor: m(parseAmount(get("tip")) ?? 0),
        taxMinor: m(parseAmount(get("tax")) ?? 0),
      });
      return;
    }

    if (spec.kind === "BOOKINGS") {
      const local = parseLocalDateTime(get("date"), get("time"), ctx.monthFirst);
      const party = Number.parseInt(get("partySize") ?? "", 10);
      if (!local) return fail("Couldn't read the date");
      if (!Number.isFinite(party) || party <= 0) return fail("Couldn't read the party size");
      out.bookings.push({ source, startsAt: zonedToUtc(local, ctx.timezone), partySize: party, status: bookingStatus(get("status")), guest: guestOf(get, spec.source) });
      return;
    }

    if (spec.kind === "GUESTS") {
      const guest = guestOf(get, spec.source);
      if (!guest) return fail("No usable email or phone");
      const consent = CONSENT_KEYS.flatMap((field) => {
        const raw = get(field);
        const value = consentValue(raw);
        return value === null ? [] : [{ field, value, raw: raw!.slice(0, 40) }];
      });
      out.guests.push({ ...guest, consent, rowId: id });
    }
  });
  return out;
}
