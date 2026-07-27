import { describe, expect, it } from "vitest";
import {
  generateFacebookMsg,
  generateInstagramDm,
  instagramHandleFromUrl,
  normalizeSequenceAngle,
} from "@/lib/outbound/sequence-messages";

describe("sequence-messages", () => {
  it("normalizes angles", () => {
    expect(normalizeSequenceAngle("review_response")).toBe("review_response");
    expect(normalizeSequenceAngle("inactive_social")).toBe("inactive_social");
    expect(normalizeSequenceAngle("weird")).toBe("general");
  });

  it("builds IG DM from observation without a link", () => {
    const dm = generateInstagramDm({
      name: "Anatolia",
      city: "Coventry",
      observation: "several recent Google reviews still have no owner replies",
      emailAngle: "review_response",
    });
    expect(dm).toContain("Anatolia");
    expect(dm).toContain("several recent Google reviews");
    expect(dm.toLowerCase()).not.toContain("http");
    expect(dm.toLowerCase()).not.toContain("trykob");
  });

  it("builds shorter FB fallback referencing observation", () => {
    const msg = generateFacebookMsg({
      name: "Anatolia",
      city: "Coventry",
      observation: "several recent Google reviews still have no owner replies",
      emailAngle: "review_response",
    });
    expect(msg).toContain("Anatolia");
    expect(msg).toContain("several recent Google reviews");
  });

  it("parses instagram handle", () => {
    expect(instagramHandleFromUrl("https://instagram.com/anatoliacoventry")).toBe("anatoliacoventry");
    expect(instagramHandleFromUrl("https://www.instagram.com/anatoliacoventry/")).toBe("anatoliacoventry");
  });
});
