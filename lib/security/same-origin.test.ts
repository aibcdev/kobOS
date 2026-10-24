import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const r = (headers: Record<string, string>) => new Request("https://trykob.com/api/actions/1/approve", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts the request's own origin", () => expect(isSameOrigin(r({ origin: "https://trykob.com" }))).toBe(true));
  it("refuses another origin", () => expect(isSameOrigin(r({ origin: "https://evil.example" }))).toBe(false));
  it("falls back to Sec-Fetch-Site", () => {
    expect(isSameOrigin(r({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOrigin(r({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });
});

describe("isSameOrigin behind a proxy", () => {
  it("accepts the Host the browser used even when req.url differs", () => {
    const req = new Request("http://localhost:3102/api/x", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3102", host: "127.0.0.1:3102" },
    });
    expect(isSameOrigin(req)).toBe(true);
  });
  it("still refuses a different site with a matching-looking path", () => {
    const req = new Request("http://localhost:3102/api/x", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:9999", host: "127.0.0.1:3102" },
    });
    expect(isSameOrigin(req)).toBe(false);
  });
});
