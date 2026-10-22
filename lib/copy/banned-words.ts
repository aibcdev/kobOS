/**
 * Words owners never see from KOB: in the app, emails, drafted replies and posts, or error messages. KOB is a
 * restaurant manager that looks after reviews, the Google listing, posts and offers, and the owner taps approve.
 * "AI" is matched case-sensitively as a whole word (so "said", "Thai" and "chair" are fine); the rest ignore case.
 */
export const BANNED_CASE_SENSITIVE = /\bAI\b/;
export const BANNED_ANY_CASE =
  /\b(artificial intelligence|chat ?bots?|bots?|automated|automation|automatically|autopilot|agents?|machine learning|algorithms?)\b/i;

/** The banned words found in `text`, in order of first appearance; empty when it's clean. */
export function bannedWordsIn(text: string): string[] {
  const out: string[] = [];
  const a = text.match(new RegExp(BANNED_CASE_SENSITIVE.source, "g"));
  if (a) out.push(...a);
  const b = text.match(new RegExp(BANNED_ANY_CASE.source, "gi"));
  if (b) out.push(...b.map((w) => w.toLowerCase()));
  return [...new Set(out)];
}
