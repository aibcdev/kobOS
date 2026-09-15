export type RuleId = "price" | "weather" | "waste" | "overtime" | "supplier";

export type PrepLevel = "relaxed" | "normal" | "strict";

export type HouseRules = {
  price: { hikePct: number | null; bookUnderGbp: number | null; answer: string }
  weather: { level: PrepLevel | null; answer: string }
  waste: { ignoreKg: number | null; ignoreGbp: number | null; theftGbp: number | null; answer: string }
  overtime: { salesPerHour: number | null; answer: string }
  supplier: { strikes: number | null; answer: string }
};

export const RULE_ORDER: RuleId[] = [
  "price",
  "weather",
  "waste",
  "overtime",
  "supplier",
];

export const EMPTY_RULES: HouseRules = {
  price: { hikePct: null, bookUnderGbp: null, answer: "" },
  weather: { level: null, answer: "" },
  waste: { ignoreKg: null, ignoreGbp: null, theftGbp: null, answer: "" },
  overtime: { salesPerHour: null, answer: "" },
  supplier: { strikes: null, answer: "" },
};

export const QUESTIONS: Record<RuleId, { title: string; ask: string }> = {
  price: {
    title: "Price",
    ask: "If a supplier raises prices, at what point should I stop them? Tell me a percent hike, and if a small rise is fine to book.",
  },
  weather: {
    title: "Weather prep",
    ask: "If the weather is bad, how hard should I cut prep — relaxed, normal, or strict?",
  },
  waste: {
    title: "Waste",
    ask: "Kitchens are messy. How much missing food is just spill, and when is it theft? Give me kilos or pounds I should ignore, and a pound figure that is a flag.",
  },
  overtime: {
    title: "Overtime",
    ask: "When the floor asks to stay late, when can I auto-approve? Give me a sales-per-hour number. If the till is not connected I will only suggest.",
  },
  supplier: {
    title: "Supplier",
    ask: "How many bad deliveries in a month before I draft a switch?",
  },
};

/** Buttons that answer the open house-rule question. Must match what was asked. */
export const RULE_CHOICES: Record<
  RuleId,
  { id: string; label: string; answer: string }[]
> = {
  price: [
    { id: "rule-price-10", label: "Stop above 10%", answer: "Stop if any item is more than 10% up. Under £5 total is fine to book." },
    { id: "rule-price-15", label: "Stop above 15%", answer: "Stop if any item is more than 15% up. Under £10 total is fine to book." },
    { id: "rule-price-ask", label: "Always ask me", answer: "Always ask me before booking a hike. No auto-book." },
  ],
  weather: [
    { id: "rule-weather-relaxed", label: "Relaxed", answer: "relaxed" },
    { id: "rule-weather-normal", label: "Normal", answer: "normal" },
    { id: "rule-weather-strict", label: "Strict", answer: "strict" },
  ],
  waste: [
    { id: "rule-waste-soft", label: "Ignore under £20", answer: "Ignore under 2kg or £20 a week. Flag theft risk above £50 of meat." },
    { id: "rule-waste-mid", label: "Ignore under £50", answer: "Ignore under 3kg or £50 a week. Flag above £100." },
    { id: "rule-waste-tight", label: "Flag everything", answer: "Ignore under 1kg or £10. Flag anything above £30." },
  ],
  overtime: [
    { id: "rule-ot-busy", label: "If busy (sales high)", answer: "Auto-approve overtime if sales are over £1500 an hour. If quiet, cut the shift." },
    { id: "rule-ot-ask", label: "Always ask me", answer: "Never auto-approve overtime. Always ask me." },
  ],
  supplier: [
    { id: "rule-sup-3", label: "3 strikes", answer: "3 bad deliveries in a month — draft a switch." },
    { id: "rule-sup-2", label: "2 strikes", answer: "2 bad deliveries in a month — draft a switch." },
    { id: "rule-sup-5", label: "5 strikes", answer: "5 bad deliveries in a month — draft a switch." },
  ],
};

export function rulesComplete(rules: HouseRules) {
  return RULE_ORDER.every((id) => rules[id].answer.trim().length > 0);
}

export function nextUnanswered(rules: HouseRules): RuleId | null {
  return RULE_ORDER.find((id) => !rules[id].answer.trim()) ?? null;
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
  if (/margin|profit|google|review|invoice|weather forecast|hours? are/.test(t)) {
    return false;
  }
  const n = nums(t);
  if (id === "price") {
    return /%|percent|hike|stop (them|it)|under £|under \$/.test(t) && n.length > 0;
  }
  if (id === "weather") {
    return /relax|normal|strict|aggress|soft|hard/.test(t);
  }
  if (id === "waste") {
    return n.length > 0 && /kg|kilo|£|\$|rand|zar|ignore|theft|spill/.test(t);
  }
  if (id === "overtime") {
    return n.length > 0 && /hour|sales|cover|ot|overtime/.test(t);
  }
  return n.length > 0 && /time|strike|deliver|month|screw/.test(t);
}

export function parseRuleAnswer(id: RuleId, text: string): HouseRules[RuleId] {
  const t = text.trim();
  const n = nums(t);
  if (id === "price") {
    const pct = n.find((v) => v <= 100) ?? n[0] ?? null;
    const gbp = n.find((v) => v !== pct) ?? (t.includes("£") || t.includes("$") ? n[0] : null);
    return { hikePct: pct, bookUnderGbp: gbp, answer: t };
  }
  if (id === "weather") {
    const level: PrepLevel = /relax|soft|low/.test(t)
      ? "relaxed"
      : /strict|hard|aggress/.test(t)
        ? "strict"
        : "normal";
    return { level, answer: t };
  }
  if (id === "waste") {
    const kg = /kg/.test(t) ? (n[0] ?? null) : n.length > 2 ? n[0] : null;
    const ignoreGbp = n[1] ?? n[0] ?? null;
    const theftGbp = n[n.length - 1] ?? null;
    return { ignoreKg: kg, ignoreGbp, theftGbp, answer: t };
  }
  if (id === "overtime") {
    return { salesPerHour: n[0] ?? null, answer: t };
  }
  return { strikes: Math.round(n[0] ?? 3), answer: t };
}

export function priceTightness(rules: HouseRules) {
  const pct = rules.price.hikePct;
  if (pct == null) return 0.5;
  return Math.min(1, Math.max(0.15, (40 - pct) / 40));
}

export function weatherSoft(rules: HouseRules) {
  return rules.weather.level === "relaxed";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export type Overrides = Partial<Record<RuleId, string>>;

export function isOverridden(overrides: Overrides, id: RuleId) {
  return overrides[id] === todayKey();
}
