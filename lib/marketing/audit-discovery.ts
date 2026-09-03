/**
 * Food-specific discovery survey after restaurant identity, before audit scan.
 * Answers qualify budget / pain before email or phone follow-up.
 */

export const AUDIT_DISCOVERY_VERSION = 2 as const;

export type AuditDiscoverySingleKey =
  | "venueSize"
  | "primaryGoal"
  | "monthlySpend"
  | "willingnessToPay"
  | "decisionMaker"
  | "timeline";

export type AuditDiscoveryMultiKey = "biggestLeaks" | "systems";

export type AuditDiscoveryAnswers = {
  venueSize: string;
  biggestLeaks: string[];
  primaryGoal: string;
  systems: string[];
  monthlySpend: string;
  willingnessToPay: string;
  decisionMaker: string;
  timeline: string;
};

export type AuditDiscoveryStored = AuditDiscoveryAnswers & {
  version: typeof AUDIT_DISCOVERY_VERSION;
  answeredAt: string;
};

type Choice = { value: string; label: string };

export type AuditDiscoveryQuestion =
  | {
      id: AuditDiscoverySingleKey;
      prompt: string;
      multi?: false;
      choices: readonly Choice[];
    }
  | {
      id: AuditDiscoveryMultiKey;
      prompt: string;
      multi: true;
      max?: number;
      choices: readonly Choice[];
    };

/** Problem-first questions for independents — no agency jargon, no competitor names. */
export const AUDIT_DISCOVERY_QUESTIONS: readonly AuditDiscoveryQuestion[] = [
  {
    id: "primaryGoal",
    prompt: "What’s the biggest problem right now?",
    choices: [
      { value: "quiet_tables", label: "Not enough covers / quiet nights" },
      { value: "weak_presence", label: "Weak online presence" },
      { value: "online_sales", label: "Not enough online or delivery orders" },
      { value: "reviews_hurt", label: "Reviews are hurting us" },
      { value: "listing_wrong", label: "Google info is wrong or outdated" },
      { value: "site_weak", label: "Website doesn’t win bookings" },
      { value: "exploring", label: "Not sure — just want a clear picture" },
    ],
  },
  {
    id: "biggestLeaks",
    prompt: "Where does that show up most? (pick up to 3)",
    multi: true,
    max: 3,
    choices: [
      { value: "empty_tables", label: "Empty tables / slow midweek" },
      { value: "hard_to_find", label: "Hard to find on Google / Maps" },
      { value: "reviews", label: "Bad or unanswered reviews" },
      { value: "google_hours", label: "Wrong hours, photos, or listing details" },
      { value: "website_menu", label: "Website or menu puts guests off" },
      { value: "delivery_orders", label: "Delivery / takeaway orders are flat" },
      { value: "booking_path", label: "Book / order / call is hard to find" },
      { value: "photos", label: "Food photos look weak online" },
      { value: "not_sure", label: "Not sure yet" },
    ],
  },
  {
    id: "venueSize",
    prompt: "How many people work in the venue?",
    choices: [
      { value: "solo", label: "Just me" },
      { value: "2_10", label: "2–10 staff" },
      { value: "11_50", label: "11–50" },
      { value: "50_plus", label: "50+" },
    ],
  },
  {
    id: "systems",
    prompt: "What do you run the venue on today?",
    multi: true,
    max: 6,
    choices: [
      { value: "no_pos", label: "No POS" },
      { value: "square", label: "Square" },
      { value: "toast", label: "Toast" },
      { value: "clover", label: "Clover" },
      { value: "lightspeed", label: "Lightspeed" },
      { value: "other_pos", label: "Other till / POS" },
      { value: "delivery_apps", label: "Deliveroo / Uber Eats / DoorDash" },
      { value: "reservations", label: "OpenTable / Resy" },
      { value: "gbp_only", label: "Mostly Google Business" },
    ],
  },
  {
    id: "monthlySpend",
    prompt: "Rough monthly spend trying to get more guests?",
    choices: [
      { value: "under_200", label: "Under £200" },
      { value: "200_500", label: "£200–£500" },
      { value: "500_2k", label: "£500–£2k" },
      { value: "2k_plus", label: "£2k+" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
  {
    id: "willingnessToPay",
    prompt: "What would a clear weekly list you only approve be worth?",
    choices: [
      { value: "under_50", label: "Under £50" },
      { value: "50_100", label: "£50–£100" },
      { value: "100_250", label: "£100–£250" },
      { value: "show_first", label: "Show me first" },
    ],
  },
  {
    id: "decisionMaker",
    prompt: "Who decides if you try something like this?",
    choices: [
      { value: "me_solo", label: "Me, solo" },
      { value: "me_partner", label: "Me + a partner" },
      { value: "recommend", label: "I recommend, someone approves" },
      { value: "wider", label: "Need wider buy-in" },
    ],
  },
  {
    id: "timeline",
    prompt: "When do you need the first fixes live?",
    choices: [
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "this_quarter", label: "This quarter" },
      { value: "exploring", label: "Just looking around" },
    ],
  },
] as const;

const SINGLE_KEYS: AuditDiscoverySingleKey[] = [
  "venueSize",
  "primaryGoal",
  "monthlySpend",
  "willingnessToPay",
  "decisionMaker",
  "timeline",
];

function choiceValues(q: AuditDiscoveryQuestion): Set<string> {
  return new Set(q.choices.map((c) => c.value));
}

function labelFor(q: AuditDiscoveryQuestion, value: string): string {
  return q.choices.find((c) => c.value === value)?.label ?? value;
}

/** Validate marketing UI answers. Returns null if incomplete or invalid. */
export function parseAuditDiscoveryAnswers(raw: unknown): AuditDiscoveryAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  for (const key of SINGLE_KEYS) {
    const q = AUDIT_DISCOVERY_QUESTIONS.find((x) => x.id === key);
    if (!q || q.multi) return null;
    const v = o[key];
    if (typeof v !== "string" || !choiceValues(q).has(v)) return null;
  }

  const leaksQ = AUDIT_DISCOVERY_QUESTIONS.find((x) => x.id === "biggestLeaks");
  const systemsQ = AUDIT_DISCOVERY_QUESTIONS.find((x) => x.id === "systems");
  if (!leaksQ?.multi || !systemsQ?.multi) return null;

  const leaks = o.biggestLeaks;
  const systems = o.systems;
  if (!Array.isArray(leaks) || leaks.length < 1 || leaks.length > (leaksQ.max ?? 3)) return null;
  if (!Array.isArray(systems) || systems.length < 1 || systems.length > (systemsQ.max ?? 6)) return null;
  if (!leaks.every((v) => typeof v === "string" && choiceValues(leaksQ).has(v))) return null;
  if (!systems.every((v) => typeof v === "string" && choiceValues(systemsQ).has(v))) return null;

  return {
    venueSize: o.venueSize as string,
    biggestLeaks: leaks as string[],
    primaryGoal: o.primaryGoal as string,
    systems: systems as string[],
    monthlySpend: o.monthlySpend as string,
    willingnessToPay: o.willingnessToPay as string,
    decisionMaker: o.decisionMaker as string,
    timeline: o.timeline as string,
  };
}

export function storeAuditDiscovery(answers: AuditDiscoveryAnswers): AuditDiscoveryStored {
  return {
    ...answers,
    version: AUDIT_DISCOVERY_VERSION,
    answeredAt: new Date().toISOString(),
  };
}

/** Optional parse from stored payload (pipeline may omit). Accepts v1 or v2. */
export function readStoredDiscovery(raw: unknown): AuditDiscoveryStored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const parsed = parseAuditDiscoveryAnswers(o);
  if (!parsed) return null;
  const answeredAt = typeof o.answeredAt === "string" ? o.answeredAt : new Date().toISOString();
  return { ...parsed, version: AUDIT_DISCOVERY_VERSION, answeredAt };
}

export function discoveryAnsweredCount(partial: Partial<AuditDiscoveryAnswers>): number {
  let n = 0;
  for (const key of SINGLE_KEYS) {
    if (typeof partial[key] === "string" && partial[key]) n += 1;
  }
  if (Array.isArray(partial.biggestLeaks) && partial.biggestLeaks.length > 0) n += 1;
  if (Array.isArray(partial.systems) && partial.systems.length > 0) n += 1;
  return n;
}

export function isDiscoveryComplete(partial: Partial<AuditDiscoveryAnswers>): boolean {
  return parseAuditDiscoveryAnswers(partial) != null;
}

/** Human labels for results / sales strip. */
export function formatDiscoverySummary(stored: AuditDiscoveryStored): { label: string; value: string }[] {
  const byId = Object.fromEntries(AUDIT_DISCOVERY_QUESTIONS.map((q) => [q.id, q])) as Record<
    string,
    AuditDiscoveryQuestion
  >;
  return [
    { label: "Biggest problem", value: labelFor(byId.primaryGoal!, stored.primaryGoal) },
    {
      label: "Where it shows up",
      value: stored.biggestLeaks.map((v) => labelFor(byId.biggestLeaks!, v)).join(", "),
    },
    { label: "Venue size", value: labelFor(byId.venueSize!, stored.venueSize) },
    {
      label: "Runs on",
      value: stored.systems.map((v) => labelFor(byId.systems!, v)).join(", "),
    },
    { label: "Spend to get guests", value: labelFor(byId.monthlySpend!, stored.monthlySpend) },
    { label: "Weekly list worth", value: labelFor(byId.willingnessToPay!, stored.willingnessToPay) },
    { label: "Decision", value: labelFor(byId.decisionMaker!, stored.decisionMaker) },
    { label: "Timeline", value: labelFor(byId.timeline!, stored.timeline) },
  ];
}

/** Map discovery problems to opportunity title keywords for light reordering. */
export function discoveryPriorityKeywords(stored: AuditDiscoveryStored): string[] {
  const keywords: string[] = [];
  const leakMap: Record<string, string[]> = {
    empty_tables: ["google", "review", "booking", "local", "seo"],
    hard_to_find: ["google", "search", "seo", "maps", "listing"],
    reviews: ["review", "rating", "reply"],
    google_hours: ["hour", "google", "listing", "gbp", "maps"],
    website_menu: ["website", "menu", "mobile", "site"],
    delivery_orders: ["delivery", "order", "takeaway", "menu"],
    booking_path: ["book", "reserv", "order", "cta", "conversion"],
    photos: ["photo", "image", "visual"],
  };
  for (const leak of stored.biggestLeaks) {
    keywords.push(...(leakMap[leak] ?? []));
  }
  const goalMap: Record<string, string[]> = {
    quiet_tables: ["google", "review", "local", "booking"],
    weak_presence: ["google", "listing", "seo", "maps"],
    online_sales: ["order", "delivery", "menu", "conversion", "mobile"],
    reviews_hurt: ["review", "rating", "reply"],
    listing_wrong: ["listing", "hour", "google", "gbp"],
    site_weak: ["website", "design", "mobile", "menu", "conversion"],
  };
  keywords.push(...(goalMap[stored.primaryGoal] ?? []));
  return [...new Set(keywords.map((k) => k.toLowerCase()))];
}

export function rankOpportunitiesByDiscovery<T extends { title: string; impactEstimate?: string }>(
  opportunities: T[],
  stored: AuditDiscoveryStored | null | undefined,
): T[] {
  if (!stored || opportunities.length < 2) return opportunities;
  const keys = discoveryPriorityKeywords(stored);
  if (!keys.length) return opportunities;
  return [...opportunities].sort((a, b) => {
    const score = (t: string) => {
      const lower = t.toLowerCase();
      return keys.reduce((acc, k) => (lower.includes(k) ? acc + 1 : acc), 0);
    };
    return score(b.title) - score(a.title);
  });
}
