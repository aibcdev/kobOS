import { describe, expect, it } from "vitest";
import { hardRuleHits } from "@/lib/marketing/copy-rules";
import { bannedWordsIn } from "@/lib/copy/banned-words";
import { PLACEHOLDERS, REPLY_TEMPLATES, THEME_LABELS } from "./reply-templates";

describe("reply templates", () => {
  it("12 to 20 templates with unique ids, each 600 characters or fewer", () => {
    expect(REPLY_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(REPLY_TEMPLATES.length).toBeLessThanOrEqual(20);
    expect(new Set(REPLY_TEMPLATES.map((t) => t.id)).size).toBe(REPLY_TEMPLATES.length);
    for (const t of REPLY_TEMPLATES) expect(t.text.length, t.id).toBeLessThanOrEqual(600);
  });

  it("every theme has a template, and only the known placeholders are used", () => {
    expect(new Set(REPLY_TEMPLATES.map((t) => t.theme))).toEqual(new Set(Object.keys(THEME_LABELS)));
    for (const t of REPLY_TEMPLATES) {
      for (const ph of t.text.match(/\{[a-zA-Z]+\}/g) ?? []) expect(PLACEHOLDERS, t.id).toContain(ph);
      expect(t.text, t.id).toContain("{managerName}");
    }
  });

  it("never offers anything for a review (Google prohibits incentives)", () => {
    for (const t of REPLY_TEMPLATES) expect(t.text, t.id).not.toMatch(/discount|voucher|free (meal|dessert|drink)|on the house|% off|refund/i);
  });

  it("follows the copy rules", () => {
    const all = REPLY_TEMPLATES.map((t) => `${t.note}\n${t.text}`).join("\n");
    expect(hardRuleHits(all, "text")).toEqual([]);
    expect(bannedWordsIn(all)).toEqual([]);
  });
});
