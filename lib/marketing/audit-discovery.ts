/**
 * Food-specific discovery survey after restaurant identity, before audit scan.
 * Answers qualify budget / pain before email or phone follow-up.
 */

export const AUDIT_DISCOVERY_VERSION = 1 as const;

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

export const AUDIT_DISCOVERY_QUESTIONS: readonly AuditDiscoveryQuestion[] = [
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
    id: "biggestLeaks",
    prompt: "Where do you lose the most guests online?",
    multi: true,
    max: 3,
    choices: [
      { value: "google_hours", label: "Google listing & hours" },
      { value: "reviews", label: "Reviews & replies" },
      { value: "website_menu", label: "Website & menu" },
      { value: "photos", label: "Photos" },
      { value: "delivery_fees", label: "Delivery marketplace fees" },
      { value: "booking_path", label: "Booking path buried" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "primaryGoal",
    prompt: "What’s the main reason you’re scanning?",
    choices: [
      { value: "covers_google", label: "More covers from Google" },
      { value: "listing_hygiene", label: "Fix listing hygiene" },
      { value: "better_website", label: "Better website" },
      { value: "cut_agency", label: "Cut agency spend" },
      { value: "vs_owner", label: "Compare vs Owner.com" },
      { value: "exploring", label: "Exploring" },
    ],
  },
  {
    id: "systems",
    prompt: "What systems do you run on today?",
    multi: true,
    max: 6,
    choices: [
      { value: "no_pos", label: "No POS" },
      { value: "square", label: "Square" },
      { value: "toast", label: "Toast" },
      { value: "clover", label: "Clover" },
      { value: "lightspeed", label: "Lightspeed" },
      { value: "other_pos", label: "Other POS" },
      { value: "delivery_apps", label: "Deliveroo / Uber Eats / DoorDash" },
      { value: "reservations", label: "OpenTable / Resy" },
      { value: "gbp_only", label: "Google Business only" },
    ],
  },
  {
    id: "monthlySpend",
    prompt: "Rough monthly spend on marketing / agencies?",
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
    prompt: "What would you pay for a clear weekly list you only approve?",
    choices: [
      { value: "under_50", label: "Under £50" },
      { value: "50_100", label: "£50–£100" },
      { value: "100_250", label: "£100–£250" },
      { value: "show_first", label: "Show me first" },
    ],
  },
  {
    id: "decisionMaker",
    prompt: "Who signs off on something like this?",
    choices: [
      { value: "me_solo", label: "Me, solo" },
      { value: "me_partner", label: "Me + a partner" },
      { value: "recommend", label: "I recommend, someone approves" },
      { value: "wider", label: "Need wider buy-in" },
    ],
  },
  {
    id: "timeline",
    prompt: "When do you want the first fixes live?",
    choices: [
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "this_quarter", label: "This quarter" },
      { value: "exploring", label: "Just exploring" },
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

/** Optional parse from stored payload (pipeline may omit). */
export function readStoredDiscovery(raw: unknown): AuditDiscoveryStored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const parsed = parseAuditDiscoveryAnswers(o);
  if (!parsed) return null;
  const answeredAt = typeof o.answeredAt === "string" ? o.answeredAt : new Date().toISOString();
  const version = o.version === AUDIT_DISCOVERY_VERSION ? AUDIT_DISCOVERY_VERSION : AUDIT_DISCOVERY_VERSION;
  return { ...parsed, version, answeredAt };
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
    { label: "Venue size", value: labelFor(byId.venueSize!, stored.venueSize) },
    {
      label: "Online leaks",
      value: stored.biggestLeaks.map((v) => labelFor(byId.biggestLeaks!, v)).join(", "),
    },
    { label: "Goal", value: labelFor(byId.primaryGoal!, stored.primaryGoal) },
    {
      label: "Systems",
      value: stored.systems.map((v) => labelFor(byId.systems!, v)).join(", "),
    },
    { label: "Marketing spend", value: labelFor(byId.monthlySpend!, stored.monthlySpend) },
    { label: "Willingness to pay", value: labelFor(byId.willingnessToPay!, stored.willingnessToPay) },
    { label: "Decision", value: labelFor(byId.decisionMaker!, stored.decisionMaker) },
    { label: "Timeline", value: labelFor(byId.timeline!, stored.timeline) },
  ];
}

/** Map discovery leaks/goals to opportunity title keywords for light reordering. */
export function discoveryPriorityKeywords(stored: AuditDiscoveryStored): string[] {
  const keywords: string[] = [];
  const leakMap: Record<string, string[]> = {
    google_hours: ["hour", "google", "listing", "gbp", "maps"],
    reviews: ["review", "rating", "reply"],
    website_menu: ["website", "menu", "mobile", "site"],
    photos: ["photo", "image", "visual"],
    delivery_fees: ["delivery", "marketplace", "uber", "deliveroo"],
    booking_path: ["book", "reserv", "order", "cta", "conversion"],
  };
  for (const leak of stored.biggestLeaks) {
    keywords.push(...(leakMap[leak] ?? []));
  }
  const goalMap: Record<string, string[]> = {
    covers_google: ["google", "search", "seo", "local"],
    listing_hygiene: ["listing", "hour", "google", "gbp"],
    better_website: ["website", "design", "mobile", "menu"],
    cut_agency: ["review", "post", "hour"],
    vs_owner: ["google", "review", "listing"],
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
