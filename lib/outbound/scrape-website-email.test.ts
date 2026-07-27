import { describe, expect, it } from "vitest";
import {
  extractEmailsFromText,
  isGoodEmailCandidate,
  scoreRestaurantEmail,
} from "@/lib/outbound/scrape-website-email";

describe("restaurant email extraction", () => {
  it("extracts emails from text", () => {
    const emails = extractEmailsFromText("Email us at anatoliacoventry@gmail.com or info@anatolia.com");
    expect(emails).toContain("anatoliacoventry@gmail.com");
    expect(emails).toContain("info@anatolia.com");
  });

  it("rejects sentry / noreply", () => {
    expect(isGoodEmailCandidate("noreply@shop.com")).toBe(false);
    expect(isGoodEmailCandidate("x@sentry.io")).toBe(false);
    expect(isGoodEmailCandidate("anatoliacoventry@gmail.com")).toBe(true);
  });

  it("scores business-name gmail above random info@other", () => {
    const name = "Anatolia";
    const named = scoreRestaurantEmail("anatoliacoventry@gmail.com", name, "anatolia.com");
    const generic = scoreRestaurantEmail("info@otherdomain.co.uk", name, "anatolia.com");
    expect(named).toBeGreaterThan(generic);
  });

  it("scores same-domain emails highest", () => {
    const name = "Crave";
    const own = scoreRestaurantEmail("info@cravefoods.co.uk", name, "cravefoods.co.uk");
    const gmail = scoreRestaurantEmail("cravebrighton@gmail.com", name, "cravefoods.co.uk");
    expect(own).toBeGreaterThan(gmail);
  });
});
