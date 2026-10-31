import { describe, expect, it } from "vitest";
import { readyToPasteLine } from "./assist";

describe("readyToPasteLine", () => {
  it("counts replies and listing changes the owner still has to post", () => {
    expect(readyToPasteLine([])).toBeNull();
    expect(readyToPasteLine(["review_reply"])).toBe("1 reply is ready to paste.");
    expect(readyToPasteLine(["review_reply", "review_reply"])).toBe("2 replies are ready to paste.");
    expect(readyToPasteLine(["review_reply", "hours", "post"])).toBe("1 reply is ready to paste. 2 listing changes are ready to update on Google.");
    expect(readyToPasteLine(["special_hours"])).toBe("1 listing change is ready to update on Google.");
  });
});
