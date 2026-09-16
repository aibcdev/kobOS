import type {
  AutonomyLevel,
  AutonomyRule,
  ChatMessage,
  Finding,
  MemoryItem,
  Restaurant,
  Review,
} from "@/lib/kob/demo-data";
import { DEMO_RESTAURANTS } from "@/lib/kob/demo-data";

export function findingsFor(restaurant: Restaurant): Finding[] {
  const hoursMismatch = restaurant.hoursGoogle !== restaurant.hoursWebsite;
  const hoursMissing = websiteHoursMissing(restaurant);
  const isProof = restaurant.id === "camberwell";
  const viewsLine =
    restaurant.monthlyGoogleViews > 0
      ? ` ${restaurant.monthlyGoogleViews.toLocaleString()} people viewed the profile last month.`
      : "";

  const findings: Finding[] = [
    {
      id: "r1",
      area: "reviews",
      ruleId: "reviews-high",
      status: "needs",
      headline: "Two new 5-star reviews",
      detail: `Both mentioned the ${restaurant.cuisine.toLowerCase()} and the room. Drafts are in your usual tone.`,
      actionLabel: "Send replies",
      estimatedMin: 8,
      approval: "auto",
    },
    {
      id: "r-low",
      area: "reviews",
      ruleId: "reviews-low",
      status: "needs",
      headline: "A guest complained about a 40-minute wait",
      detail:
        "Similar comments appeared twice this month. I have not replied, and I have not offered a voucher.",
      actionLabel: "Review the reply",
      estimatedMin: 6,
      approval: "ask",
    },
    {
      id: "g1",
      area: "google",
      ruleId: "hours",
      status: hoursMismatch ? "needs" : "done",
      headline: hoursMissing
        ? "Hours are missing from the website"
        : hoursMismatch
          ? "Google hours don't match the website"
          : "Google hours match the website",
      detail: hoursMissing
        ? `Directories disagree with each other, and ${restaurant.website} does not list hours. I have not guessed the real ones.`
        : hoursMismatch
          ? `Google: ${restaurant.hoursGoogle}. Website: ${restaurant.hoursWebsite}.${viewsLine}`
          : "Hours, phone and address match across Google and the website.",
      actionLabel: hoursMissing
        ? "Ask which hours are true"
        : hoursMismatch
          ? "Align hours"
          : undefined,
      estimatedMin: 4,
      approval: "ask",
    },
    {
      id: "w1",
      area: "website",
      ruleId: "menu",
      status: "needs",
      headline: isProof
        ? "Wine list PDF on the site is dated 20 August 2022"
        : "The online menu still shows an old price",
      detail: isProof
        ? "Still served from thecamberwellarms.co.uk. I have not taken it down."
        : "A guest mentioned it in a review. The printed menu is already updated.",
      actionLabel: isProof ? "Flag with you" : "Queue menu change",
      estimatedMin: 6,
      approval: "ask",
    },
    {
      id: "rep1",
      area: "reputation",
      status: "up",
      headline: `Rating holding at ${restaurant.rating.toFixed(1)}`,
      detail: isProof
        ? `${restaurant.reviewCount} Google reviews, as listed publicly.`
        : `${restaurant.reviewCount} reviews. Five of the last fourteen mention slow service — up from one the month before.`,
      approval: "ask",
    },
    {
      id: "res1",
      area: "reservations",
      ruleId: "google-info",
      status: "needs",
      headline: restaurant.bookingUrl
        ? "Booking link works — but it isn't on Google"
        : "No booking link on Google or the website",
      detail: restaurant.bookingUrl
        ? `Your site points to ${restaurant.bookingUrl}. The Google profile still has no reservation button.`
        : "Guests searching you on Google have no way to book from the listing.",
      actionLabel: "Add booking link",
      estimatedMin: 3,
      approval: "ask",
    },
  ];

  if (!isProof) {
    findings.push(
      {
        id: "s1",
        area: "social",
        ruleId: "hours",
        status: "needs",
        headline: "Instagram still shows last season's hours in the bio",
        detail: "Not costing bookings yet, but it will over a bank holiday.",
        actionLabel: "Draft a bio update",
        estimatedMin: 2,
        approval: "ask",
      },
      {
        id: "c1",
        area: "competition",
        ruleId: "promos",
        status: "alert",
        headline: "A nearby room just launched a weekday set lunch",
        detail: `${restaurant.city} independents within a ten-minute walk. Worth watching, not copying — and I will not discount Friday or Saturday to compete.`,
        approval: "ask",
      },
    );
  }

  return findings;
}

export function reviewsFor(restaurant: Restaurant): Review[] {
  const isProof = restaurant.id === "camberwell";
  return [
    {
      id: "rv1",
      author: "Priya M",
      rating: 5,
      text: isProof
        ? "Came back for the third time. The pie is still the reason we cross town."
        : `Came back for the third time. The ${restaurant.cuisine.toLowerCase()} is still the reason we cross town.`,
      when: "Yesterday",
      status: "replied",
      reply:
        "Thanks for coming back in — we're glad it's become a habit. See you again soon.",
    },
    {
      id: "rv2",
      author: "Tom H",
      rating: 5,
      text: isProof
        ? "Quiet Tuesday lunch, lovely room, staff were unhurried and kind."
        : "Quiet Tuesday lunch, lovely room, staff were unhurried and kind.",
      when: "Yesterday",
      status: "replied",
      reply:
        "Glad you caught us on a quieter day — Tuesday lunch is a good one if you want the room to yourselves.",
    },
    {
      id: "rv3",
      author: "Elena R",
      rating: 3,
      text: "Food was good but we waited forty minutes for mains on Saturday. Won't be our Friday spot until that's sorted.",
      when: "Yesterday",
      status: "escalate",
      draft:
        "Sorry about the wait on Saturday — that's not the evening we want to give you. I've flagged it with the floor team. If you come back, ask for the manager and we'll look after you.",
    },
    {
      id: "rv4",
      author: "Chris P",
      rating: 4,
      text: isProof
        ? "Great dinner. The wine list on the website still looks a few years old."
        : "Great brunch. Website still has the old price on the smashed eggs though.",
      when: "2 days ago",
      status: "draft",
      draft: isProof
        ? "Thanks Chris — good catch. I'll flag the list with the manager; we have not taken the file down."
        : "Thanks Chris — and good catch. The printed menu is right; we're updating the site today.",
    },
  ];
}

export function morningMessages(
  restaurant: Restaurant,
  rules: AutonomyRule[] = DEFAULT_AUTONOMY,
): ChatMessage[] {
  const finds = applyAutonomyToFindings(findingsFor(restaurant), rules);
  const handled = finds.filter(
    (f) => f.status === "done" && levelFor(f, rules) === "handle",
  );
  const suggest = finds.filter(
    (f) => f.status === "needs" && levelFor(f, rules) === "ask" && f.actionLabel,
  );
  const locked = finds.filter(
    (f) => f.status === "needs" && levelFor(f, rules) === "always-ask",
  );

  const hours = finds.find((f) => f.ruleId === "hours");
  const wait = finds.find((f) => f.id === "r-low");

  const handledLine = handled.length
    ? handled.some((f) => f.ruleId === "reviews-high")
      ? "I already replied to overnight 5-stars in your usual tone."
      : `I already handled ${handled[0].headline.toLowerCase()} on autopilot.`
    : `I looked at ${restaurant.name} this morning.`;

  const suggestLines: string[] = [];
  if (hours?.status === "needs") {
    suggestLines.push(
      websiteHoursMissing(restaurant)
        ? "The website does not list hours, and the directories disagree with each other. I can put one set on the site — once you tell me which hours are true."
        : "Google still has different hours to the website. I can set both to match.",
    );
  }
  const menu = finds.find((f) => f.ruleId === "menu");
  if (menu?.status === "needs" && levelFor(menu, rules) === "ask") {
    suggestLines.push(
      "The website menu still shows an old price. I'll queue it to the printed one.",
    );
  }
  const booking = finds.find((f) => f.ruleId === "google-info");
  if (booking?.status === "needs" && levelFor(booking, rules) === "ask") {
    suggestLines.push(
      restaurant.bookingUrl
        ? "Your booking link isn't on Google. I'll add it."
        : "Guests on Google have no way to book. I'll add a link.",
    );
  }

  const lockedLine = wait
    ? "The wait complaint stays with you. I have not offered a voucher."
    : locked.length
      ? `${locked[0].headline} stays with you.`
      : "";

  const intro = [
    `Morning, ${restaurant.ownerFirstName}.`,
    handledLine,
    ...suggestLines,
    lockedLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = [{ id: "m1", role: "kob", text: intro }];

  if (suggest.length) {
    const bits = suggest.map((f) => {
      if (f.ruleId === "hours") {
        return websiteHoursMissing(restaurant)
          ? "Hours drafted — waiting for you to say which are true"
          : "Hours drafted — waiting. Not posted to Google";
      }
      if (f.ruleId === "menu") return "Website menu queued to the printed one";
      if (f.ruleId === "google-info") return "Booking link drafted for Google. Not posted";
      if (f.ruleId === "reviews-high") return "Five-star thank-yous drafted. Not posted to Google";
      return f.headline;
    });
    messages.push({
      id: "m3",
      role: "kob",
      text: `I can take ${suggest.length === 1 ? "that job" : "those jobs"} now. After that, I keep going until you tell me to stop.`,
      actions: [
        { id: "approve-all", label: "Take them", kind: "approve" },
        { id: "review", label: "Tell me first", kind: "yes" },
      ],
      doneText: `Done.\n${bits.join(".\n")}.\nI'll keep watching.`,
    });
  } else if (locked.length) {
    messages.push({
      id: "m3",
      role: "kob",
      text: "The morning is done on my side. One thing is protected — I will not touch it until you do.",
    });
  } else {
    messages.push({
      id: "m3",
      role: "kob",
      text: "The morning is clear. I'll keep watching.",
    });
  }

  return messages;
}

export function levelFor(
  finding: Finding,
  rules: AutonomyRule[],
): AutonomyLevel | undefined {
  if (!finding.ruleId) return undefined;
  return rules.find((rule) => rule.id === finding.ruleId)?.level;
}

export function applyAutonomyToFindings(
  findings: Finding[],
  rules: AutonomyRule[],
): Finding[] {
  return findings.map((finding) => {
    const level = levelFor(finding, rules);
    if (!level) return finding;
    const actionable =
      Boolean(finding.actionLabel) ||
      finding.status === "needs" ||
      finding.status === "alert";
    if (!actionable) return finding;
    if (finding.status === "up") return finding;
    if (finding.status === "alert" && !finding.actionLabel) return finding;
    if (level === "handle") return { ...finding, status: "done" };
    if (finding.status === "done" && finding.actionLabel) {
      return { ...finding, status: "needs" };
    }
    return finding;
  });
}

export function applyAutonomyToReviews(
  reviews: Review[],
  rules: AutonomyRule[],
): Review[] {
  const high = rules.find((rule) => rule.id === "reviews-high")?.level ?? "handle";
  const low = rules.find((rule) => rule.id === "reviews-low")?.level ?? "always-ask";
  return reviews.map((review) => {
    const level = review.rating >= 4 ? high : low;
    if (level === "handle") {
      return {
        ...review,
        status: "replied",
        reply: review.reply ?? review.draft,
      };
    }
    if (review.rating >= 4) {
      return { ...review, status: "draft", reply: undefined };
    }
    return { ...review, status: "escalate", reply: undefined };
  });
}

export function autonomyRate(rules: AutonomyRule[]) {
  if (!rules.length) return 0;
  return Math.round(
    (rules.filter((rule) => rule.level === "handle").length / rules.length) * 100,
  );
}

export function levelName(level: AutonomyLevel) {
  if (level === "handle") return "Autopilot";
  if (level === "always-ask") return "Never without you";
  return "Suggest";
}

export const DEFAULT_AUTONOMY: AutonomyRule[] = [
  {
    id: "reviews-high",
    label: "4 and 5 star reviews",
    detail: "The easy ones. This is how trust usually starts.",
    level: "handle",
    suggest: "KOB drafts the reply and waits.",
    autopilot: "KOB replies in your tone, then tells you.",
    never: "Even a 5-star sits until you send it.",
  },
  {
    id: "reviews-low",
    label: "Complaints and 1–3 star reviews",
    detail: "KOB will not offer a voucher unless you say so.",
    level: "always-ask",
    suggest: "KOB drafts, then waits.",
    autopilot: "KOB replies without a voucher or refund.",
    never: "The complaint comes straight to you.",
  },
  {
    id: "hours",
    label: "Opening hours",
    detail: "Google, website, booking page, Instagram bio.",
    level: "ask",
    suggest: "KOB prepares the change everywhere, then asks.",
    autopilot: "KOB aligns hours wherever they are wrong.",
    never: "Hours never move without you.",
  },
  {
    id: "menu",
    label: "Menu and pricing",
    detail: "Never publish a price without you — until you move this.",
    level: "always-ask",
    suggest: "KOB flags the mismatch and queues a draft.",
    autopilot: "KOB updates the public menu to match the printed one.",
    never: "Prices do not change without you.",
  },
  {
    id: "google-info",
    label: "Google information",
    detail: "Phone, booking links, categories, photos.",
    level: "ask",
    suggest: "KOB proposes the listing fix.",
    autopilot: "KOB keeps the listing complete.",
    never: "The listing does not change without you.",
  },
  {
    id: "promos",
    label: "Offers and discounts",
    detail: "KOB will not discount Friday or Saturday nights.",
    level: "always-ask",
    suggest: "KOB may propose a weekday note. Never a Friday cut.",
    autopilot: "Weekday notes only. Friday and Saturday stay full price.",
    never: "No offer goes out unless you write it.",
  },
];

export const DEFAULT_MEMORY: MemoryItem[] = [
  {
    id: "mem1",
    text: "Never discount Friday nights.",
    learned: "Offers only Monday–Thursday, unless you ask.",
  },
  {
    id: "mem2",
    text: "Shorter, more casual review replies.",
    learned: "Sign off simply. Use first names when the guest does.",
  },
];

const AREAS = [
  "neighbourhood café",
  "high-street bistro",
  "all-day kitchen",
  "wine bar",
  "independent restaurant",
];
const CITIES = [
  ["Hackney", "London"],
  ["Heeley", "Sheffield"],
  ["Jesmond", "Newcastle"],
  ["Stokes Croft", "Bristol"],
  ["Finnieston", "Glasgow"],
  ["Digbeth", "Birmingham"],
];

function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function restaurantFromQuery(query: string): Restaurant {
  const cleaned = query.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const nameGuess = cleaned
    .replace(/\.(com|co\.uk|uk|net|studio|kitchen|cafe)$/i, "")
    .replace(/[-_.]/g, " ")
    .replace(/\bwww\b/gi, "")
    .trim();
  const name = toTitleCase(nameGuess || "Your restaurant");
  const existing = DEMO_RESTAURANTS.find(
    (r) =>
      r.name.toLowerCase() === name.toLowerCase() ||
      r.id === query.trim().toLowerCase() ||
      r.website.includes(query.trim().toLowerCase()),
  );
  if (existing) return existing;

  const h = hashString(name.toLowerCase());
  const [area, city] = CITIES[h % CITIES.length];
  const rating = 4.2 + ((h >> 3) % 7) / 10;
  const views = 220 + (h % 900);
  const closeGoogle = 3 + (h % 3);
  const closeWeb = closeGoogle + 1 + (h % 2);
  const first = ["Alex", "Sam", "Nina", "Omar", "Helen", "Pat"][h % 6];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return {
    id: `custom-${slug.slice(0, 24) || h.toString(16)}`,
    name,
    area,
    city,
    cuisine: AREAS[h % AREAS.length],
    rating: Math.round(rating * 10) / 10,
    reviewCount: 80 + (h % 420),
    priceLevel: (["££", "££", "£££"] as const)[h % 3],
    hoursGoogle: `Tue–Sat 9am–${closeGoogle + 5}pm · Sun 10am–${closeGoogle}pm`,
    hoursWebsite: `Tue–Sat 9am–${closeWeb + 5}pm · Sun 10am–${closeWeb}pm`,
    website: `${slug || "yourrestaurant"}.example`,
    phone: "020 0000 0000",
    address: `${area}, ${city}`,
    ownerFirstName: first,
    monthlyGoogleViews: views,
    covers: `${28 + (h % 30)} covers`,
  };
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function searchRestaurants(query: string): Restaurant[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEMO_RESTAURANTS;
  const hits = DEMO_RESTAURANTS.filter((r) =>
    `${r.name} ${r.area} ${r.city} ${r.cuisine}`.toLowerCase().includes(q),
  );
  if (hits.length) return hits;
  return [restaurantFromQuery(query)];
}

export function websiteHoursMissing(restaurant: Restaurant) {
  return /not listed|not published/i.test(restaurant.hoursWebsite);
}
