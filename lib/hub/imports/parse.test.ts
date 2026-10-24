import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { csvRecords, parseAmount, parseCsv, parseLocalDateTime } from "@/lib/hub/imports/csv";
import { autoMapping, detectSource, mapRecords, missingFields } from "@/lib/hub/imports/sources";

const fixture = (f: string) => readFileSync(`lib/hub/imports/fixtures/${f}`, "utf8");

describe("CSV parsing", () => {
  it("handles quotes, doubled quotes, CRLF, BOM and semicolons", () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
    expect(parseCsv("a;b;c\n1;2,5;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2,5", "3"],
    ]);
    expect(parseCsv('a,b\n"multi\nline",2\n\n')).toEqual([
      ["a", "b"],
      ["multi\nline", "2"],
    ]);
  });

  it("skips a statement's title block to find the header row", () => {
    const { headers, records } = csvRecords(fixture("deliveroo-statement.csv"));
    expect(headers).toEqual(["Order number", "Date", "Time", "Order value", "Refunds", "Status"]);
    expect(records[0]).toMatchObject({ "Order number": "10001", "Order value": "£24.50" });
  });

  it("reads amounts in UK, EU and accounting formats", () => {
    expect(["£1,234.50", "1.234,50", "99,00", "(6.00)", "-3", "12.00-", "GBP 7.5", "", "abc"].map(parseAmount)).toEqual([1234.5, 1234.5, 99, -6, -3, -12, 7.5, null, null]);
  });

  it("reads dates day-first by default, month-first for US, with optional times", () => {
    expect(parseLocalDateTime("14/10/2026", "19:42")).toBe("2026-10-14T19:42:00");
    expect(parseLocalDateTime("10/14/2026", "7:05 pm", true)).toBe("2026-10-14T19:05:00");
    expect(parseLocalDateTime("13/10/2026", undefined, true)).toBe("2026-10-13T00:00:00");
    expect(parseLocalDateTime("2026-10-14T08:00:00")).toBe("2026-10-14T08:00:00");
    expect(parseLocalDateTime("14 Oct 2026 12:30")).toBe("2026-10-14T12:30:00");
    expect(parseLocalDateTime("14/10/26")).toBe("2026-10-14T00:00:00");
    expect(parseLocalDateTime("not a date")).toBeNull();
    expect(parseLocalDateTime("40/40/2026")).toBeNull();
  });
});

describe("source detection and mapping", () => {
  it("recognises exports by filename, headers, or the best column fit", () => {
    const deliveroo = csvRecords(fixture("deliveroo-statement.csv"));
    expect(detectSource("deliveroo-statement.csv", deliveroo.headers).source).toBe("DELIVEROO_CSV");
    expect(detectSource("payments.csv", ["Order ID", "Order Date", "Sales (incl. VAT)", "Uber Eats fee"]).source).toBe("UBER_EATS_CSV");
    expect(detectSource("export.csv", csvRecords(fixture("guest-list.csv")).headers).source).toBe("GUESTS_CSV");
    expect(detectSource("export.csv", csvRecords(fixture("bookings.csv")).headers).source).toBe("BOOKINGS_CSV");
    expect(detectSource("odd-sales.csv", ["When", "Takings", "Note"]).source).toBe("GENERIC_SALES_CSV");
    expect(detectSource("Acme Invoice 123.pdf", []).source).toBe("INVOICE_PDF");
    expect(detectSource("dinner-menu.pdf", []).source).toBe("MENU_PDF");
    expect(detectSource("anything.csv", ["Date", "Total", "x"], "BOOKINGS_CSV").source).toBe("BOOKINGS_CSV");
  });

  it("maps sales rows: refunds, refund-only rows, cancellations, bad rows, stable ids", () => {
    const { headers, records } = csvRecords(fixture("deliveroo-statement.csv"));
    const spec = detectSource("deliveroo.csv", headers);
    const mapping = autoMapping(spec, headers);
    expect(mapping).toEqual({ orderId: "Order number", date: "Date", time: "Time", total: "Order value", refund: "Refunds", status: "Status" });
    expect(missingFields(spec, mapping)).toEqual([]);
    const ctx = { spec, mapping, timezone: "Europe/London", currency: "GBP", monthFirst: false, importJobId: "job1", sourceKind: "FILE_IMPORT" as const };
    const out = mapRecords(records, ctx);
    expect(out.orders.map((o) => [o.source.externalId, o.status, o.channel, o.placedAt.toISOString(), o.totalMinor, o.refundedMinor])).toEqual([
      ["10001", "COMPLETED", "DELIVERY", "2026-10-14T18:42:00.000Z", 2450, 0],
      ["10002", "REFUNDED", "DELIVERY", "2026-10-14T22:30:00.000Z", 1800, 400],
      ["10003", "CANCELLED", "DELIVERY", "2026-10-15T11:00:00.000Z", 999, 0],
      ["10004", "REFUNDED", "DELIVERY", "2026-10-15T11:30:00.000Z", 0, 600],
    ]);
    expect(out.errors).toEqual([{ row: 6, message: "Couldn't read the date" }]);

    const generic = detectSource("odd.csv", ["When", "Takings"]);
    const rows = [{ When: "2026-10-14", Takings: "10" }];
    const a = mapRecords(rows, { ...ctx, spec: generic, mapping: { date: "When", total: "Takings" } });
    const b = mapRecords(rows, { ...ctx, spec: generic, mapping: { date: "When", total: "Takings" } });
    expect(a.orders[0].source.externalId).toMatch(/^row:[0-9a-f]{24}$/);
    expect(a.orders[0].source.externalId).toBe(b.orders[0].source.externalId);
  });
});
