import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
