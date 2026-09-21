import type { KobIntentKind } from "./types";

const ACTION_VERBS =
  /\b(update|reply|replies|change|close|closed|closing|publish|order|book|send|fix|switch|handle|apply|set|post|draft|approve|do it|go ahead|take them)\b/i;

const RULE_PATTERNS =
  /\b(never|always|don't|do not|remember|from now on|house rule)\b/i;

const CONNECTION_PATTERNS =
  /\b(connect|reconnect|link|integration|invoice inbox|till|pos|opentable)\b/i;

const OPERATIONAL =
  /\b(margin|food cost|supplier|invoice|price|hours|google|website|review|prep|waste|booking|reservation|call|menu|sales|cost|salmon|focaccia|pastry|covers|attention|needs me|what did you|handled today|closed|open until|discount|friday|coffee supplier)\b/i;

const GENERAL_OK =
  /^(what is|what's|define|explain|how does|how do i think about)\b.*\b(gross margin|food cost|gp|ebitda|yield)\b/i;

export function classifyIntent(text: string): KobIntentKind {
  const t = text.trim();
  if (!t) return "CLARIFICATION" as KobIntentKind; // map below
  if (/^(yes|yep|yeah|ok|okay|do it|go ahead|approve|apply|take them)\b/i.test(t)) {
    return "APPROVAL";
  }
  if (RULE_PATTERNS.test(t) && /(never|always|don't|do not)/i.test(t)) {
    return "RULE_MEMORY";
  }
  if (CONNECTION_PATTERNS.test(t) && !OPERATIONAL.test(t)) {
    return "CONNECTION";
  }
  if (ACTION_VERBS.test(t) && OPERATIONAL.test(t)) {
    return "RESTAURANT_ACTION";
  }
  if (
    ACTION_VERBS.test(t) &&
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|hours|review|supplier)\b/i.test(t)
  ) {
    return "RESTAURANT_ACTION";
  }
  // "We're closed Monday" — operational day + closed state
  if (
    /\b(closed|close)\b/i.test(t) &&
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(t)
  ) {
    return "RESTAURANT_ACTION";
  }
  if (GENERAL_OK.test(t) && !/\b(my|our|last week|this week|yesterday|tomorrow)\b/i.test(t)) {
    return "GENERAL";
  }
  if (OPERATIONAL.test(t) || /\b(my|our)\b/i.test(t)) {
    return "RESTAURANT_QUESTION";
  }
  if (ACTION_VERBS.test(t)) {
    return "RESTAURANT_ACTION";
  }
  return "GENERAL";
}

/** Fix empty → clarification */
export function classifyIntentSafe(text: string): KobIntentKind {
  if (!text.trim()) return "UNSUPPORTED";
  const k = classifyIntent(text);
  return k;
}

export function requiresRestaurantGrounding(intent: KobIntentKind, text: string): boolean {
  if (intent === "GENERAL") return false;
  if (intent === "UNSUPPORTED") return false;
  if (intent === "APPROVAL") return true;
  if (intent === "RULE_MEMORY") return true;
  if (intent === "CONNECTION") return true;
  if (intent === "RESTAURANT_QUESTION" || intent === "RESTAURANT_ACTION") return true;
  return OPERATIONAL.test(text);
}

export function isActionRequest(intent: KobIntentKind, text: string): boolean {
  return intent === "RESTAURANT_ACTION" || (ACTION_VERBS.test(text) && OPERATIONAL.test(text));
}

export { ACTION_VERBS };
