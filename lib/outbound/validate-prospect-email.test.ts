import { describe, expect, it } from "vitest";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

describe("isValidProspectEmail", () => {
  it("accepts matching domain emails", () => {
    expect(isValidProspectEmail("admin@thebap.co.uk", "https://thebap.co.uk").ok).toBe(true);
  });

  it("rejects wix sentry junk", () => {
    const result = isValidProspectEmail(
      "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com",
      "https://example.com",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects deliveroo platform emails", () => {
    expect(isValidProspectEmail("hello@deliveroo.fr", "https://hookandline.co.uk").ok).toBe(false);
  });

  it("rejects domain mismatch", () => {
    expect(isValidProspectEmail("info@random.com", "https://thebap.co.uk").ok).toBe(false);
  });

  it("accepts personal inboxes listed on the restaurant site", () => {
    expect(
      isValidProspectEmail("akmodali@icloud.com", "https://www.currymasterindian.co.uk").ok,
    ).toBe(true);
  });
});
