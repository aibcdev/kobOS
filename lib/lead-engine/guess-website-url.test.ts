import { describe, expect, it } from "vitest";
import { scoreWebsiteHtmlMatch } from "@/lib/lead-engine/guess-website-url";

describe("scoreWebsiteHtmlMatch", () => {
  it("scores currymasterindian.co.uk highly for Curry Master Eastbourne", () => {
    const html = `
      <title>Best Indian Takeaway in Eastbourne | Curry Master</title>
      <body>${"Curry Master Indian Food Takeaway Eastbourne Green Street. ".repeat(40)}</body>
    `;
    const score = scoreWebsiteHtmlMatch(
      "Curry Master",
      "Eastbourne",
      html,
      "https://www.currymasterindian.co.uk/",
    );
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it("rejects parked domain pages", () => {
    const html = `<title>currymaster.uk is for sale</title><body>Buy this domain</body>`;
    const score = scoreWebsiteHtmlMatch("Curry Master", "Eastbourne", html, "https://currymaster.uk");
    expect(score).toBeLessThan(0);
  });

  it("rejects generic domain with no name/city match", () => {
    const html = `<title>Welcome</title><body>Generic hosting page</body>`;
    const score = scoreWebsiteHtmlMatch("Ruby", "Walsall", html, "https://ruby.co.uk");
    expect(score).toBeLessThan(25);
  });
});
