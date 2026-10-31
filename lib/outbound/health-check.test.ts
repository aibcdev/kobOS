import { describe, expect, it } from "vitest";
import { findings, healthCheckMarkdown, PRICE_REPLY, problemHookSequence, type GoogleListingFacts } from "@/lib/outbound/health-check";
import { bannedWordsIn } from "@/lib/copy/banned-words";

const facts = (over: Partial<GoogleListingFacts> = {}): GoogleListingFacts => ({
  placeId: "p1",
  name: "Osteria Lume",
  address: "1 High St, Peckham",
  businessStatus: "OPERATIONAL",
  rating: 4.4,
  reviewCount: 212,
  sampleReviews: [{ rating: 2, publishTime: "2026-10-01T10:00:00Z", text: "Slow service" }],
  photoCount: 10,
  hours: ["Monday: 12:00 – 22:00"],
  websiteUri: "https://osterialume.example",
  mapsUri: "https://maps.google.com/?cid=1",
  ...over,
});

describe("findings", () => {
  it("leads with the by-hand unanswered count", () => {
    const f = findings(facts({ photoCount: 3 }), { unansweredRecent: 4 });
    expect(f.map((x) => x.key)).toEqual(["unanswered", "few_photos"]);
    expect(f[0].line).toBe("4 of Osteria Lume's Google reviews from the last few months don't have a reply yet");
  });

  it("never invents an unanswered count", () => {
    expect(findings(facts()).find((x) => x.key === "unanswered")).toBeUndefined();
  });

  it("flags missing hours, website and a closed status", () => {
    const keys = findings(facts({ hours: [], websiteUri: null, businessStatus: "CLOSED_TEMPORARILY" })).map((x) => x.key);
    expect(keys).toEqual(["status", "no_hours", "no_website"]);
  });

  it("10 photos means 10 or more, so no photo finding", () => {
    expect(findings(facts({ photoCount: 10 }))).toEqual([]);
  });
});

describe("problemHookSequence", () => {
  it("returns null when there's nothing real to lead with", () => {
    expect(problemHookSequence(facts())).toBeNull();
  });

  it("first email: one problem, a reply ask, no price and no link", () => {
    const [first] = problemHookSequence(facts(), { unansweredRecent: 2, firstName: "Sam" })!;
    expect(first.subject).toBe("Osteria Lume's Google reviews");
    expect(first.body).toContain("Hi Sam,");
    expect(first.body).toContain("I noticed 2 of Osteria Lume's Google reviews");
    expect(first.body).toContain("Want me to send over a free check");
    expect(first.body).not.toMatch(/\$|£|https?:\/\//);
  });

  it("four useful touches, all with the unsubscribe line and none with a price", () => {
    const seq = problemHookSequence(facts({ hours: [] }))!;
    expect(seq.map((d) => d.sendAfterDays)).toEqual([0, 3, 7, 12]);
    for (const d of seq) {
      expect(d.body).toContain('reply "unsubscribe"');
      expect(d.body).not.toMatch(/\$|£/);
    }
  });

  it("no banned wording anywhere", () => {
    const seq = problemHookSequence(facts({ hours: [], websiteUri: null }), { unansweredRecent: 3 })!;
    const all = [...seq.flatMap((d) => [d.subject, d.body]), healthCheckMarkdown(facts(), { unansweredRecent: 3 }), PRICE_REPLY].join("\n");
    expect(bannedWordsIn(all)).toEqual([]);
    expect(all).not.toMatch(/\bphone\b|\bPOS\b|automatically/i);
  });
});

describe("healthCheckMarkdown", () => {
  it("says what wasn't checked instead of guessing", () => {
    const md = healthCheckMarkdown(facts(), {}, new Date("2026-10-31"));
    expect(md).toContain("Reviews with no reply (last 90 days): not checked yet");
    expect(md).toContain("Photos: 10 or more");
    expect(md).toContain("not the newest");
  });
});
