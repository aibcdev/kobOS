import { describe, expect, it } from "vitest";
import { looksLikeWebsiteInput, normalizeAuditWebsiteUrl } from "./normalize-website-url";

describe("looksLikeWebsiteInput", () => {
  it("accepts bare domains", () => {
    expect(looksLikeWebsiteInput("turtlebay.co.uk")).toBe(true);
    expect(looksLikeWebsiteInput("www.example.com")).toBe(true);
  });

  it("accepts full URLs", () => {
    expect(looksLikeWebsiteInput("https://turtlebay.co.uk/menu")).toBe(true);
  });

  it("rejects place-name style queries", () => {
    expect(looksLikeWebsiteInput("Turtle Bay London")).toBe(false);
    expect(looksLikeWebsiteInput("turtle")).toBe(false);
  });
});

describe("normalizeAuditWebsiteUrl", () => {
  it("adds https for bare domains", () => {
    expect(normalizeAuditWebsiteUrl("turtlebay.co.uk")).toBe("https://turtlebay.co.uk/");
  });

  it("preserves existing scheme", () => {
    expect(normalizeAuditWebsiteUrl("http://example.com")).toBe("http://example.com/");
  });

  it("returns null for invalid input", () => {
    expect(normalizeAuditWebsiteUrl("not a url")).toBe(null);
    expect(normalizeAuditWebsiteUrl("")).toBe(null);
  });
});
