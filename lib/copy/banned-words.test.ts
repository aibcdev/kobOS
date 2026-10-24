import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanReply } from "@/lib/connectors/gbp/drafter";
import { bannedWordsIn } from "./banned-words";

/**
 * Owners never see AI, bot, agent, automated, autopilot… anywhere in the signed-in product, its pages' titles and
 * descriptions, or its emails. Marketing pages have their own guard (lib/marketing/banned-words.test.ts, PR #46).
 * Internal ops pages (app/ops) are staff-only and out of scope.
 */
const ROOTS = [
  "app/(product)",
  "app/dashboard",
  "components/dashboard",
  "components/kob-app",
  "components/kob-talk",
  "components/actions",
  "components/hub",
  "components/kob-onboard",
  "lib/email",
];

/** Strings a person reads: JSX text and quoted strings with a space in them. Imports, comments, paths and identifiers are skipped. */
function visibleStrings(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  src.split("\n").forEach((l, i) => {
    const t = l.trim();
    if (/^(import|export .* from|\/\/|\*|\/\*|\{\/\*)/.test(t)) return;
    for (const m of l.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`|>([^<>{}\n]+)</g)) {
      const s = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
      if (s && /\s/.test(s)) out.push({ line: i + 1, text: s });
    }
    // A label on its own (e.g. `AUTOPILOT: "Autopilot"`).
    for (const m of l.matchAll(/:\s*"([A-Z][a-z]+)"/g)) out.push({ line: i + 1, text: m[1] });
  });
  return out;
}

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

describe("no AI wording anywhere owners look", () => {
  it("the signed-in app, dashboard and emails are clean", () => {
    const offenders: string[] = [];
    for (const root of ROOTS)
      for (const file of walk(path.join(process.cwd(), root)))
        for (const { line, text } of visibleStrings(readFileSync(file, "utf8")))
          if (bannedWordsIn(text).length) offenders.push(`${path.relative(process.cwd(), file)}:${line}  ${text.slice(0, 100)}`);
    expect(offenders).toEqual([]);
  });

  it("catches the words and leaves ordinary ones alone", () => {
    expect(visibleStrings(`<p>Approve AI offers</p>`).flatMap((s) => bannedWordsIn(s.text))).toEqual(["AI"]);
    expect(visibleStrings(`const MODE = { AUTOPILOT: "Autopilot" };`).flatMap((s) => bannedWordsIn(s.text))).toEqual(["autopilot"]);
    expect(visibleStrings(`import { x } from "@/lib/agent/ledger";\nconst href = "/dashboard/growth-agent";`)).toEqual([]);
    expect(bannedWordsIn("A Thai place said the main was great")).toEqual([]);
  });

  it("a drafted reply that mentions AI is thrown away", () => {
    expect(cleanReply("Thanks so much for visiting — this reply was written by our AI assistant.")).toBeNull();
    expect(cleanReply("Thanks so much for visiting, we hope to see you again soon. The team")).not.toBeNull();
  });
});
