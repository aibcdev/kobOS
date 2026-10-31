import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { linksTo, parseCsv, readLinkLog, redirectProblem, robotsAllows } from "./link-log";

const HEADER = "date,type,target_url,contact,our_url,status,live_link_url,anchor_text,notes";

describe("link log", () => {
  it("the checked-in log parses cleanly", () => {
    const text = readFileSync(path.resolve(__dirname, "../../data/link-log.csv"), "utf8");
    expect(readLinkLog(text).problems).toEqual([]);
  });

  it("parses quoted commas and quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3\n')).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  });

  it("flags unknown types, statuses and live rows without a link", () => {
    const { problems } = readLinkLog(`${HEADER}\n2026-10-31,blog,https://x.com,,/,live,,,\n`);
    expect(problems).toEqual(['line 2: unknown type "blog"', "line 2: live but no live_link_url"]);
  });

  it("finds a real link to trykob.com, not a mention or a lookalike", () => {
    expect(linksTo('<p>See <a class="x" href="https://trykob.com/pricing">KOB</a></p>')).toBe(true);
    expect(linksTo("<a href='https://www.trykob.com'>KOB</a>")).toBe(true);
    expect(linksTo("<p>trykob.com is great</p>")).toBe(false);
    expect(linksTo('<a href="https://nottrykob.com.evil.io/">x</a>')).toBe(false);
  });

  it("respects Disallow for *", () => {
    const robots = "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\n";
    expect(robotsAllows(robots, "/blog/best-tools")).toBe(true);
    expect(robotsAllows(robots, "/private/page")).toBe(false);
  });

  it("one hop to a 200 is fine; two hops or a non-200 is not", () => {
    expect(redirectProblem([{ url: "http://trykob.com/", status: 301 }, { url: "https://trykob.com/", status: 200 }])).toBeNull();
    expect(redirectProblem([{ url: "a", status: 301 }, { url: "b", status: 308 }, { url: "c", status: 200 }])).toMatch(/^2 hops/);
    expect(redirectProblem([{ url: "a", status: 404 }])).toBe("ends on 404");
  });
});
