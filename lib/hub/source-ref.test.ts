import { describe, expect, it } from "vitest";
import { sourceLabel, sourceRefFromRow } from "@/lib/hub/source-ref";

describe("sourceLabel", () => {
  it("API rows: provider, noun, short id and local time", () => {
    expect(
      sourceLabel({ kind: "API", provider: "SQUARE", externalId: "a12fXk9Lq0w", noun: "order", occurredAt: "2026-10-14T18:42:00Z" }, "Europe/London"),
    ).toBe("From Square order #A12F · 14 Oct 19:42");
  });

  it("uses the restaurant's timezone", () => {
    expect(
      sourceLabel({ kind: "WEBHOOK", provider: "SQUARE", externalId: "a12fXk9Lq0w", noun: "order", occurredAt: "2026-10-14T03:00:00Z" }, "America/New_York"),
    ).toBe("From Square order #A12F · 13 Oct 23:00");
  });

  it("imports: statement and upload date", () => {
    expect(sourceLabel({ kind: "FILE_IMPORT", provider: "DELIVEROO_CSV", externalId: "row-1", importedAt: "2026-10-13T09:00:00Z" })).toBe(
      "From Deliveroo statement CSV (uploaded 13 Oct)",
    );
    expect(sourceLabel({ kind: "EMAIL_INGEST", provider: "UBER_EATS_PDF", externalId: "x", importedAt: "2026-10-13T09:00:00Z" })).toBe(
      "From Uber Eats statement PDF (emailed 13 Oct)",
    );
  });

  it("short ids stay whole, owner-entered rows say so", () => {
    expect(sourceLabel({ kind: "API", provider: "TOAST", externalId: "1234", noun: "check" })).toBe("From Toast check #1234");
    expect(sourceLabel({ kind: "OWNER_ENTERED", provider: "KOB", externalId: "x" })).toBe("Entered by you");
  });

  it("maps fact-row columns", () => {
    expect(sourceRefFromRow({ sourceKind: "FILE_IMPORT", sourceProvider: "DELIVEROO_CSV", sourceExternalId: "r1", sourceImportJobId: "job" })).toEqual({
      kind: "FILE_IMPORT",
      provider: "DELIVEROO_CSV",
      externalId: "r1",
      importJobId: "job",
    });
    expect(sourceRefFromRow({ sourceKind: "weird", sourceProvider: "SQUARE", sourceExternalId: "r1" }).kind).toBe("API");
  });
});
