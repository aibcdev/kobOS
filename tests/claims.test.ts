import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStripeTrialDays } from "@/lib/billing/stripe-server";
import { TRIAL_DAYS } from "@/lib/billing/offer";

const root = path.resolve(__dirname, "..");

function files(rel: string): string[] {
  const full = path.join(root, rel);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(path.join(rel, name)));
}

const MARKETING = [
  "app/(marketing)",
  "components/marketing",
  "components/kob-home",
  "components/kob-site",
  "lib/marketing",
  "lib/homepage-defaults.ts",
].flatMap(files).filter((f) => /\.(ts|tsx|md|mdx)$/.test(f) && !/\.test\.tsx?$/.test(f));

/** Stale prices, other trial lengths, and unsourced claims. Owner.com's $249/$499 stay allowed (dated source). */
const DENY: [string, RegExp][] = [
  ["old Flex price $49", /\$49(?!\d)/],
  ["old price £99", /£99(?!\d)/],
  ["prototype tier £149", /£149/],
  ["prototype tier £299", /£299/],
  ["agency price £497", /£497/],
  ["14-day trial", /14[- ]day/i],
  ["3-day trial", /\b3[- ]day/i],
  ["unsourced 180+ sites", /180\+/],
  ["unsourced 2x claim", /2(×|x) more/i],
  ["unsourced £1,200", /£1,200/],
];

const rel = (f: string) => path.relative(root, f);

describe("marketing claims", () => {
  it.each(DENY)("no %s", (_label, pattern) => {
    const hits = MARKETING.filter((f) => pattern.test(readFileSync(f, "utf8"))).map(rel);
    expect(hits).toEqual([]);
  });

  it("pricing, trial, signup and checkout import price and trial instead of hard-coding them", () => {
    const pages = [
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/trial/page.tsx",
      "app/(marketing)/signup/page.tsx",
      "app/(marketing)/audit/[id]/upgrade/checkout/page.tsx",
      "components/marketing/saas/SaasSignupPage.tsx",
      "components/marketing/saas/SaasSignupTrialForm.tsx",
      "components/marketing/audit/AuditUpgradeCheckout.tsx",
      "lib/marketing/pricing-plans.ts",
    ];
    const literals = /£79|\$99(?!\d)|\b7[- ]day|\b7 days|[Ss]even days|a week\. No card/;
    const hardCoded = pages.filter((p) => literals.test(readFileSync(path.join(root, p), "utf8")));
    expect(hardCoded).toEqual([]);
  });

  it("Stripe trial length matches the offer copy", () => {
    expect(getStripeTrialDays()).toBe(TRIAL_DAYS);
  });
});
