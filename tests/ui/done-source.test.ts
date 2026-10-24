import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

/** Every surface that shows action status to an owner. */
const SURFACES = [
  "components/kob-talk/cards",
  "components/actions",
  "app/(product)/app/needs-you",
  "app/(product)/app/actions",
  "app/(product)/app/activity",
  "app/(product)/app/settings/permissions",
  "lib/agent",
];

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function files(dir: string): string[] {
  const abs = path.join(root, dir);
  try {
    statSync(abs);
  } catch {
    return [];
  }
  return readdirSync(abs, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => path.join(dir, f));
}

describe('"Done" comes only from ownerFacingStatus() in lib/os/gates.ts', () => {
  it("no status surface hard-codes Done", () => {
    const offenders: string[] = [];
    for (const file of SURFACES.flatMap(files)) {
      const src = stripComments(readFileSync(path.join(root, file), "utf8"));
      // A string literal or JSX text containing the word "Done".
      if (/(["'`>][^"'`<\n]*\bDone\b)/.test(src)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("gates.ts says Done only for VERIFIED", () => {
    const src = stripComments(readFileSync(path.join(root, "lib/os/gates.ts"), "utf8"));
    const lines = src.split("\n").filter((l) => /"Done"/.test(l));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/status === "VERIFIED"/);
  });
});
