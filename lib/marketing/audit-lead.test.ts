import { describe, expect, it } from "vitest";
import { auditPhoneValidationMessage, isValidAuditPhone, normalizeAuditPhone } from "./audit-lead";

describe("audit-lead", () => {
  it("normalizes UK-style numbers", () => {
    expect(normalizeAuditPhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizeAuditPhone("07700 900123")).toBe("07700900123");
  });

  it("requires at least 10 digits", () => {
    expect(isValidAuditPhone("12345")).toBe(false);
    expect(isValidAuditPhone("+1 415 555 0100")).toBe(true);
    expect(auditPhoneValidationMessage("")).toMatch(/mobile number/i);
  });
});
