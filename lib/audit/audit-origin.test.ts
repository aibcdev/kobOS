import { describe, expect, it } from "vitest";
import { auditOriginFromHeaders, INTERNAL_AUDIT_HEADER } from "./audit-start-shared";

describe("auditOriginFromHeaders", () => {
  it("tags our own scripts as internal and everything else as a visitor", () => {
    expect(auditOriginFromHeaders(new Headers({ [INTERNAL_AUDIT_HEADER]: "1" }))).toBe("internal");
    expect(auditOriginFromHeaders(new Headers())).toBe("visitor");
    expect(auditOriginFromHeaders(new Headers({ [INTERNAL_AUDIT_HEADER]: "yes" }))).toBe("visitor");
  });
});
