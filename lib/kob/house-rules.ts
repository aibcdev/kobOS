/**
 * Only rules KOB can actually act on with the free tools an owner has on day one:
 * public Google reviews, Google vs website hours, and a photo of a delivery note.
 * No till, no rota, no supplier network — so no questions about them.
 */
export type RuleId = "reviews" | "hours" | "invoice";

export type ReplyMode = "handle" | "show" | "never";
export type HoursMode = "fix" | "show";

export type HouseRules = {
  reviews: { mode: ReplyMode | null; answer: string }
  hours: { mode: HoursMode | null; answer: string }
  invoice: { flagPct: number | null; answer: string }
};

export const RULE_ORDER: RuleId[] = ["reviews", "hours", "invoice"];

/** Ask these in Talk. Invoice uses a 10% default until they change it. */
const ASK_ORDER: RuleId[] = ["reviews", "hours"];

export const EMPTY_RULES: HouseRules = {
  reviews: { mode: null, answer: "" },
  hours: { mode: null, answer: "" },
  invoice: { flagPct: 10, answer: "Flag invoice lines more than 10% above the last price I read." },
};

type AutonomyLike = { id: string; level: string };

export function houseRulesFromAutonomy(autonomy: AutonomyLike[]): HouseRules {
  const reviewsHigh = autonomy.find((r) => r.id === "reviews-high")?.level;
  const hours = autonomy.find((r) => r.id === "hours")?.level;
  const reviewsMode: ReplyMode =
    reviewsHigh === "handle" ? "handle" : reviewsHigh === "always-ask" ? "show" : "show";
  const hoursMode: HoursMode = hours === "handle" ? "fix" : "show";
  return {
    reviews: {
      mode: reviewsMode,
      answer:
        reviewsMode === "handle"
          ? "Post the thank-you on 5-star reviews with no complaint. Everything else waits for me."
          : "Draft every reply and show me before it goes public.",
    },
    hours: {
      mode: hoursMode,
      answer:
        hoursMode === "fix"
          ? "When Google and the website disagree, fix Google to match the site and tell me after."
          : "Show me the hours change before anything goes live on Google.",
    },
    invoice: { ...EMPTY_RULES.invoice },
  };
}

export function sanitizeHouseRules(raw: unknown): HouseRules {
  const r = (raw ?? {}) as Partial<HouseRules>;
  return {
    reviews: {
      mode: r.reviews?.mode ?? null,
      answer: r.reviews?.answer ?? "",
    },
    hours: {
      mode: r.hours?.mode ?? null,
      answer: r.hours?.answer ?? "",
    },
    invoice: {
      flagPct: r.invoice?.flagPct ?? EMPTY_RULES.invoice.flagPct,
      answer: r.invoice?.answer || EMPTY_RULES.invoice.answer,
    },
  };
}

export const QUESTIONS: Record<RuleId, { title: string; ask: string }> = {
  reviews: {
    title: "Review replies",
    ask: "I can see your public Google reviews. When a guest leaves 5 stars and no complaint, should I post the thank-you in your tone, or show you first? Anything below 5 stars always waits for you.",
  },
  hours: {
    title: "Opening hours",
    ask: "I compare your Google hours with your website. When they disagree, should I fix Google to match the site, or show you the change first?",
  },
  invoice: {
    title: "Invoice prices",
    ask: "Send me a photo of a delivery note and I read the lines. How big a price rise should I flag — 10%, 15%, or every rise?",
  },
};

/** Buttons that answer the open house-rule question. Must match what was asked. */
export const RULE_CHOICES: Record<
  RuleId,
  { id: string; label: string; answer: string }[]
> = {
  reviews: [
    {
      id: "rule-reviews-handle",
      label: "Post 5-star thank-yous",
      answer: "Post the thank-you on 5-star reviews with no complaint. Everything else waits for me.",
    },
    {
      id: "rule-reviews-show",
      label: "Show me every reply",
      answer: "Draft every reply and show me before it goes public.",
    },
    {
      id: "rule-reviews-never",
      label: "Don't reply for me",
      answer: "Do not reply to reviews. Tell me what came in and I will handle it.",
    },
  ],
  hours: [
    {
      id: "rule-hours-fix",
      label: "Fix Google to match the site",
      answer: "When Google and the website disagree, fix Google to match the site and tell me after.",
    },
    {
      id: "rule-hours-show",
      label: "Show me the change first",
      answer: "Show me the hours change before anything goes live on Google.",
    },
  ],
  invoice: [
    { id: "rule-invoice-10", label: "Flag over 10%", answer: "Flag any invoice line more than 10% above the last price." },
    { id: "rule-invoice-15", label: "Flag over 15%", answer: "Flag any invoice line more than 15% above the last price." },
    { id: "rule-invoice-all", label: "Flag every rise", answer: "Flag every price rise on a delivery note, however small." },
  ],
};

export function rulesComplete(rules: HouseRules) {
  return ASK_ORDER.every((id) => rules[id].answer.trim().length > 0);
}

export function nextUnanswered(rules: HouseRules): RuleId | null {
  return ASK_ORDER.find((id) => !rules[id].answer.trim()) ?? null;
}

function nums(text: string) {
  return [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
}

export function looksLikeQuestion(text: string) {
  const t = text.trim().toLowerCase();
  if (t.includes("?")) return true;
  return /^(how|what|why|when|where|who|can |could |should |help|improve|i want|tell me|check |look at)/.test(
    t,
  );
}

export function looksLikeRuleAnswer(id: RuleId, text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (looksLikeQuestion(t)) return false;
  if (id === "reviews") {
    return /5[- ]?star|five star|thank|reply|replies|show me|don'?t reply|never reply|post/.test(t);
  }
  if (id === "hours") {
    return /google|website|site|hours|fix|match|show me/.test(t);
  }
  return /%|percent|every rise|any rise|all rises|flag/.test(t) && (nums(t).length > 0 || /every|any|all/.test(t));
}

export function parseRuleAnswer(id: RuleId, text: string): HouseRules[RuleId] {
  const t = text.trim();
  const low = t.toLowerCase();
  if (id === "reviews") {
    const mode: ReplyMode = /do not|don'?t|never/.test(low)
      ? "never"
      : /show me|draft every|before it goes/.test(low)
        ? "show"
        : "handle";
    return { mode, answer: t };
  }
  if (id === "hours") {
    const mode: HoursMode = /show me|before anything|wait/.test(low) ? "show" : "fix";
    return { mode, answer: t };
  }
  const pct = nums(low).find((v) => v > 0 && v <= 100) ?? (/every|any|all/.test(low) ? 0 : null);
  return { flagPct: pct, answer: t };
}

/** How tight the owner wants price flagging — drives orb motion only. */
export function priceTightness(rules: HouseRules) {
  const pct = rules.invoice.flagPct;
  if (pct == null) return 0.5;
  if (pct === 0) return 1;
  return Math.min(1, Math.max(0.15, (40 - pct) / 40));
}

/** Owner let KOB post the easy 5-star thank-yous. */
export function repliesOnAutopilot(rules: HouseRules) {
  return rules.reviews.mode === "handle";
}

/** Owner wants Google hours fixed without a stop each time. */
export function hoursOnAutopilot(rules: HouseRules) {
  return rules.hours.mode === "fix";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export type Overrides = Partial<Record<RuleId, string>>;

export function isOverridden(overrides: Overrides, id: RuleId) {
  return overrides[id] === todayKey();
}
