import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCE_ARTICLES } from "@/lib/marketing/resources/articles";
import { HARD_RULE_BANS, hardRuleHits, unsourcedClaims } from "@/lib/marketing/copy-rules";

const ROOT = path.resolve(__dirname, "../..");

const COPY_ROOTS = [
  "app/(marketing)",
  "components/kob-home",
  "components/marketing",
  "lib/marketing",
];

const BANNED: { label: string; re: RegExp }[] = [
  { label: "adapter", re: /\badapter\b/i },
  { label: "read-back", re: /read-back/i },
  { label: "write-back", re: /write-back/i },
  { label: "OCR", re: /\bOCR\b/ },
  { label: "ingest", re: /\bingest\b/i },
  { label: "truth log", re: /truth log/i },
  { label: "Holding", re: /\bHolding\b/ },
  { label: "on this site yet", re: /on this site yet/i },
  { label: "dreamed", re: /\bdreamed\b/i },
  { label: "superpower", re: /\bsuperpower\b/i },
  { label: "AI restaurant manager", re: /AI restaurant manager/i },
  { label: "The AI Restaurant Manager", re: /The AI Restaurant Manager/ },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts|txt|mdx)$/.test(name) && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("public marketing copy", () => {
  it("does not use banned words", () => {
    const hits: string[] = [];
    for (const root of COPY_ROOTS) {
      for (const file of walk(path.join(ROOT, root))) {
        const text = readFileSync(file, "utf8");
        for (const ban of BANNED) {
          if (ban.re.test(text)) {
            hits.push(`${path.relative(ROOT, file)}: ${ban.label}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("does not say Coming next on the homepage", () => {
    const files = [
      "app/(marketing)/page.tsx",
      "app/(marketing)/layout.tsx",
      "components/kob-home/employee-home.tsx",
      "components/kob-home/site-home.tsx",
      "components/kob-home/hero.tsx",
      "components/kob-site/site-footer.tsx",
      "components/kob-site/site-nav.tsx",
    ];
    const hits = files.filter((file) =>
      readFileSync(path.join(ROOT, file), "utf8").includes("Coming next"),
    );
    expect(hits).toEqual([]);
  });
});

/**
 * The hard rules from the content briefs, on the copy written for search and outreach: articles, free tools and the
 * writers page. .ts data files are checked by string literal (so identifiers like aiMenu are fine); pages by their
 * text with comments stripped.
 */
const HARD_RULE_FILES = [
  "lib/marketing/resources/articles.ts",
  "lib/marketing/brand-facts.ts",
  "lib/marketing/tools",
  "components/marketing/tools",
  "app/(marketing)/tools",
  "app/(marketing)/press",
];

function filesUnder(rel: string): string[] {
  const full = path.join(ROOT, rel);
  return statSync(full).isDirectory() ? walk(full) : [full];
}

describe("hard rules on search and outreach copy", () => {
  it("no banned words, em dashes or buzzwords", () => {
    const hits: string[] = [];
    for (const rel of HARD_RULE_FILES) {
      for (const file of filesUnder(rel)) {
        for (const label of hardRuleHits(readFileSync(file, "utf8"), file.endsWith(".tsx") ? "page" : "data")) {
          hits.push(`${path.relative(ROOT, file)}: ${label}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("catches the words it should", () => {
    expect(hardRuleHits('const a = { description: "Our AI writes replies" };', "data")).toContain("AI");
    expect(hardRuleHits('const a = "Seamless \u2014 posts automatically";', "data")).toEqual(
      expect.arrayContaining(["em dash", "seamless", "auto-post"]),
    );
    expect(hardRuleHits("const aiMenu = 1; // AI comment", "data")).toEqual([]);
    expect(HARD_RULE_BANS.length).toBeGreaterThan(10);
  });

  it("articles with a percentage or multiplier cite a source", () => {
    const missing = RESOURCE_ARTICLES.filter((a) => !a.sources?.length && unsourcedClaims(JSON.stringify(a)).length).map(
      (a) => `${a.slug}: ${unsourcedClaims(JSON.stringify(a)).join(", ")}`,
    );
    expect(missing).toEqual([]);
  });
});
