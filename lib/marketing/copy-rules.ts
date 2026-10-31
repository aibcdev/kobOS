/**
 * Hard rules for search and outreach copy (kobOS-x-posts-brief §0, T9): no "AI"/LLM/GPT wording, nothing about phones
 * or tills, no auto-posting claims, no em dashes and no buzzwords. Shared by banned-words.test.ts and the llms.txt
 * build check, so both fail on the same words.
 */
export const HARD_RULE_BANS: { label: string; re: RegExp }[] = [
  { label: "AI", re: /\bAI\b/i },
  { label: "artificial intelligence", re: /artificial intelligence/i },
  { label: "LLM", re: /\bLLMs?\b/i },
  { label: "GPT", re: /\bGPT\b/i },
  { label: "ChatGPT", re: /ChatGPT/i },
  { label: "phone", re: /\bphones?\b/i },
  { label: "call us", re: /\bcall us\b/i },
  { label: "POS", re: /\bPOS\b/i },
  { label: "point of sale", re: /point[- ]of[- ]sale/i },
  { label: "auto-post", re: /auto-?post|automatically post|posts? automatically/i },
  { label: "em dash", re: /—/ },
  { label: "leverage", re: /\bleverag(e|es|ed|ing)\b/i },
  { label: "seamless", re: /\bseamless(ly)?\b/i },
  { label: "revolutionise", re: /\brevolutioni[sz]e/i },
  { label: "game-changer", re: /\bgame-?changer/i },
  { label: "cutting-edge", re: /cutting-edge/i },
  { label: "unlock", re: /\bunlock/i },
  { label: "supercharge", re: /\bsupercharge/i },
  { label: "fast-paced", re: /in today's fast-paced/i },
  { label: "elevate", re: /\belevat(e|es|ed|ing)\b/i },
  { label: "delve", re: /\bdelv(e|es|ing)\b/i },
];

const STRING_LITERAL = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm;

/**
 * Labels of the rules `source` breaks. "data": only string literals count (identifiers like aiMenu are fine).
 * "page": all text with comments and import lines removed, which covers JSX text.
 */
export function hardRuleHits(source: string, kind: "data" | "page" | "text"): string[] {
  const text =
    kind === "text"
      ? source
      : kind === "data"
        ? (source.replace(COMMENTS, "$1").match(STRING_LITERAL) ?? []).join("\n")
        : source.replace(COMMENTS, "$1").replace(/^import .*$/gm, "");
  return HARD_RULE_BANS.filter((b) => b.re.test(text)).map((b) => b.label);
}

/** Percentages and "3x" multipliers: numbers that need a cited source next to them. */
export function unsourcedClaims(text: string): string[] {
  return [...new Set(text.match(/\b\d+(\.\d+)?\s?%|\b\d+(\.\d+)?x\b/g) ?? [])];
}
