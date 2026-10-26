import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/agent/review-reply", () => ({ draftReplyForReview: vi.fn() }));

import { MAX_PER_PASTE, parseReviews, ratingIn } from "@/lib/reviews/manual";

describe("ratingIn()", () => {
  it("reads stars and written ratings", () => {
    expect(ratingIn("★★★★☆ lovely")).toBe(4);
    expect(ratingIn("5/5 would go again")).toBe(5);
    expect(ratingIn("3 stars, slow service")).toBe(3);
    expect(ratingIn("Rating: 2")).toBe(2);
  });

  it("never guesses: no rating is 0", () => {
    expect(ratingIn("Great food, friendly staff")).toBe(0);
  });
});

describe("parseReviews()", () => {
  it("one review stays one review", () => {
    expect(parseReviews("Best curry in town.")).toEqual([{ body: "Best curry in town.", rating: 0, reviewer: null, url: null }]);
  });

  it("splits on blank lines and --- lines", () => {
    const out = parseReviews("Lovely lunch.\n\nCold chips.\n---\nGreat staff!");
    expect(out.map((r) => r.body)).toEqual(["Lovely lunch.", "Cold chips.", "Great staff!"]);
  });

  it("pulls out the name, stars and link from a Google copy", () => {
    const [r] = parseReviews(
      "Sam Patel\nLocal Guide · 12 reviews · 3 photos\n★★★★★\na week ago\nThe lamb was perfect.\nhttps://maps.app.goo.gl/abc123",
    );
    expect(r).toEqual({ body: "The lamb was perfect.", rating: 5, reviewer: "Sam Patel", url: "https://maps.app.goo.gl/abc123" });
  });

  it("reads 'Name: text' and a trailing '— Name'", () => {
    const [a, b] = parseReviews("Jo: Brilliant brunch, 4/5\n\nWaited 40 minutes for a table.\n— Chris");
    expect(a).toMatchObject({ reviewer: "Jo", rating: 4, body: "Brilliant brunch," });
    expect(b).toMatchObject({ reviewer: "Chris", body: "Waited 40 minutes for a table." });
  });

  it("keeps a stars-only review and drops empty chunks", () => {
    expect(parseReviews("★★★\n\n\n\n---\n")).toEqual([{ body: "", rating: 3, reviewer: null, url: null }]);
    expect(parseReviews("   \n\n")).toEqual([]);
  });

  it(`caps a paste at ${MAX_PER_PASTE}`, () => {
    const many = Array.from({ length: MAX_PER_PASTE + 5 }, (_, i) => `Review number ${i}.`).join("\n\n");
    expect(parseReviews(many)).toHaveLength(MAX_PER_PASTE);
  });
});
