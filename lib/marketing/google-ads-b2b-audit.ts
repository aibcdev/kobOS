/**
 * KOB B2B Google Ads — Search campaign for restaurant-owner acquisition via free audit.
 * Buyer = restaurant owners / operators (not diners).
 *
 * Copy strategy mirrors Owner.com Ads Transparency / Meta Ads Library playbook
 * (free scan, SEO report, marketing software, site check) but only claims what KOB ships.
 * Comparative Owner.com lines use factual pricing from OWNER_COMPARISON (pricing-plans).
 */

export type B2bMatchType = "BROAD" | "PHRASE" | "EXACT";

export type B2bKeyword = {
  text: string;
  matchType: B2bMatchType;
  adGroup: string;
};

export type B2bAuditAdsPlan = {
  version: 1;
  source: "kob_b2b_audit_ads";
  createdAt: string;
  campaignName: string;
  finalUrl: string;
  dailyBudgetGbp: number;
  locations: string[];
  adGroups: Array<{
    name: string;
    headlines: string[];
    descriptions: string[];
    path1: string;
    path2: string;
  }>;
  keywords: B2bKeyword[];
  negativeKeywords: string[];
  notes: string[];
};

const FINAL_URL = "https://trykob.com/go/audit";

/** Seed + Keyword Planner terms the user asked to include. */
export const B2B_AUDIT_SEED_KEYWORDS = [
  "restaurant marketing",
  "restaurant tips",
  "restaurant software",
  "restaurant management software",
  "restaurant accounting software",
  "restaurant pos software",
  "restaurant inventory software",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function uniqueKeywords(items: B2bKeyword[]): B2bKeyword[] {
  const seen = new Set<string>();
  const out: B2bKeyword[] = [];
  for (const k of items) {
    const key = `${k.adGroup}|${k.matchType}|${k.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

export function buildB2bAuditKeywords(): B2bKeyword[] {
  const marketing: B2bKeyword[] = [
    { text: "restaurant marketing", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant marketing ideas", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant marketing strategies", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant marketing software", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant marketing tools", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant marketing for owners", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "how to market a restaurant", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "how to promote your restaurant", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "get more restaurant customers", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant social media marketing", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "restaurant google marketing", matchType: "PHRASE", adGroup: "Marketing" },
    { text: "free restaurant marketing scan", matchType: "PHRASE", adGroup: "Marketing" },
  ];

  const tips: B2bKeyword[] = [
    { text: "restaurant tips", matchType: "PHRASE", adGroup: "Tips & advice" },
    { text: "restaurant business tips", matchType: "PHRASE", adGroup: "Tips & advice" },
    { text: "tips for restaurant owners", matchType: "PHRASE", adGroup: "Tips & advice" },
    { text: "restaurant owner tips", matchType: "PHRASE", adGroup: "Tips & advice" },
    { text: "how to grow a restaurant", matchType: "PHRASE", adGroup: "Tips & advice" },
    { text: "restaurant growth tips", matchType: "PHRASE", adGroup: "Tips & advice" },
  ];

  const software: B2bKeyword[] = [
    { text: "restaurant software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant management software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant accounting software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant pos software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant inventory software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "best restaurant software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant software for small business", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "restaurant business software", matchType: "PHRASE", adGroup: "Restaurant software" },
    { text: "ai tools for restaurants", matchType: "PHRASE", adGroup: "Restaurant software" },
  ];

  const audit: B2bKeyword[] = [
    { text: "restaurant website audit", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "restaurant google business audit", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "restaurant online presence check", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "restaurant seo audit", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "free restaurant seo report", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "free restaurant marketing audit", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "restaurant visibility report", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "audit my restaurant website", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "free restaurant site check", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "restaurant online health score", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "improve google maps restaurant", matchType: "PHRASE", adGroup: "Free audit" },
    { text: "local restaurant seo", matchType: "PHRASE", adGroup: "Free audit" },
  ];

  const conquest: B2bKeyword[] = [
    // Brand conquest — phrase + exact only (no broad)
    { text: "owner.com", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner.com", matchType: "EXACT", adGroup: "Owner.com alternative" },
    { text: "owner com", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner com", matchType: "EXACT", adGroup: "Owner.com alternative" },
    { text: "owner restaurant", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner restaurant", matchType: "EXACT", adGroup: "Owner.com alternative" },
    { text: "owner app", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner app", matchType: "EXACT", adGroup: "Owner.com alternative" },
    { text: "owner.com alternative", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner.com alternative", matchType: "EXACT", adGroup: "Owner.com alternative" },
    { text: "owner.com vs", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "cheaper than owner.com", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "owner.com pricing", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "toast website alternative", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "restaurant marketing agency", matchType: "PHRASE", adGroup: "Owner.com alternative" },
    { text: "better than seo agency restaurant", matchType: "PHRASE", adGroup: "Owner.com alternative" },
  ];

  return uniqueKeywords([...marketing, ...tips, ...software, ...audit, ...conquest]);
}

/**
 * RSA assets — Owner.com-style hooks, KOB-true claims only.
 * Do NOT claim: ordering, delivery, loyalty, AI full-site redesign, #1 ratings.
 */
const AD_GROUPS: B2bAuditAdsPlan["adGroups"] = [
  {
    name: "Marketing",
    path1: "audit",
    path2: "marketing",
    headlines: [
      "Free Restaurant Marketing Scan",
      "Restaurant Marketing Software",
      "See What’s Costing Orders",
      "Scan Your Site in Seconds",
      "How to Promote Your Restaurant",
      "Find Gaps Guests Notice",
      "Get More Local Customers",
      "No Card · Free Scan",
      "Website + Google + Reviews",
      "Built for Busy Owners",
      "Approve Fixes in One Tap",
      "KOB Free Marketing Audit",
      "Stop Guessing What to Fix",
      "Daily List You Control",
      "Built for busy independent restaurants",
    ],
    descriptions: [
      "Free restaurant marketing scan — website, Google listing & reviews. See what’s holding you back.",
      "Before new marketing ideas, see what your site and Google profile need first. Free, no card.",
      "Restaurant marketing software for independents: free audit, then a daily list you approve.",
      "Find what’s costing customers online. Free scan in about a minute — nothing goes live without you.",
    ],
  },
  {
    name: "Tips & advice",
    path1: "audit",
    path2: "tips",
    headlines: [
      "How to Grow Your Restaurant",
      "Restaurant Owner Tips",
      "Fix Online Presence First",
      "What Guests Notice First",
      "Free Tips From Your Audit",
      "Grow Without an Agency",
      "1-Minute Visibility Scan",
      "No Card · Free Report",
      "Practical Owner Advice",
      "Clear Daily Next Steps",
      "Website & Google Tips",
      "Built for Busy Owners",
      "KOB Free Restaurant Audit",
      "Skip Generic Marketing Tips",
      "See Your Real Online Gaps",
    ],
    descriptions: [
      "Before trying new marketing ideas, see what your restaurant website needs to fix first — free.",
      "Owner tips that matter: what guests see before they visit. Free scan, no card required.",
      "Skip generic advice. Get a free audit of your site, Google profile, and reviews in ~1 minute.",
      "Practical growth tips for independents — start with a free visibility audit on trykob.com.",
    ],
  },
  {
    name: "Restaurant software",
    path1: "audit",
    path2: "software",
    headlines: [
      "Restaurant Marketing Software",
      "AI Tools for Restaurants",
      "Not Another Bloated Stack",
      "Free Audit Before You Buy",
      "Growth Software From $49",
      "Simpler Than Full Platforms",
      "Website + Google Software",
      "Daily Owner Co-Pilot",
      "1-Minute Free Restaurant Scan",
      "No Card Required",
      "Approve Changes Yourself",
      "KOB Growth Software",
      "Built for Independents",
      "Credits for Site & SEO",
      "Cancel Anytime",
    ],
    descriptions: [
      "Restaurant marketing software designed to grow covers — start with a free online presence audit.",
      "AI-assisted restaurant growth report. See what’s hurting your online presence — free, no card.",
      "Looking at restaurant software? First see what guests see online. Free website & Google audit.",
      "From $49/mo after a free scan. Daily list you approve — not a week of demos to get started.",
    ],
  },
  {
    name: "Free audit",
    path1: "free",
    path2: "audit",
    headlines: [
      "Free Restaurant Site Check",
      "Free Restaurant SEO Report",
      "Improve Google Map Presence",
      "Free Online Health Score",
      "Scan Your Site in Seconds",
      "See Why You’re Losing Guests",
      "Website + GBP + Reviews",
      "Takes About 1 Minute",
      "No Credit Card Needed",
      "Local Restaurant SEO Audit",
      "Find What’s Hurting SEO",
      "KOB Free Perception Audit",
      "Clear Fix List After Scan",
      "Built for Restaurant Owners",
      "Get Your Free Report",
    ],
    descriptions: [
      "Enter your restaurant — get a free online health score. Website, Google Maps presence & reviews.",
      "Free restaurant SEO report. Find what’s hurting search ranking and local visibility — no card.",
      "Improve how guests find you on Google. Free site check in seconds, clear next steps after.",
      "Find out why competitors look stronger online. Free audit of site, listing, and reviews.",
    ],
  },
  {
    name: "Owner.com alternative",
    path1: "audit",
    path2: "vs-owner",
    headlines: [
      "Owner.com Alternative",
      "Lower Price Than Owner.com",
      "From $49 — Not $249",
      "Skip Owner.com Pricing",
      "Better Price. Clearer Job.",
      "Free Scan — No Demo Wait",
      "Simpler Than Owner.com",
      "Owner.com vs KOB",
      "Daily List Owner.com Lacks",
      "Cancel Anytime · No Lock-In",
      "Free Audit Before You Pay",
      "KOB vs Owner.com",
      "Same Job. Lower Price.",
      "Approve-Only Growth Tool",
      "Try Free — Then Compare",
    ],
    descriptions: [
      "Owner.com starts ~$249/mo. KOB Flex from $49/mo after a free audit — same growth job, lower price.",
      "Looking for an Owner.com alternative? Free scan in ~1 min. Daily list you approve. Cancel anytime.",
      "Better priced than Owner.com for busy independents. Free online health scan — no card, no demo gate.",
      "Compare after you scan: KOB shows website, Google & review gaps, then a daily list you control.",
    ],
  },
];

/** Trim headlines to Google RSA max (30). */
function trimHeadlines(hs: string[]): string[] {
  return hs.map((h) => h.slice(0, 30));
}

export function buildB2bAuditAdsPlan(input?: {
  dailyBudgetGbp?: number;
  locations?: string[];
  finalUrl?: string;
}): B2bAuditAdsPlan {
  const dailyBudgetGbp = Math.min(500, Math.max(10, input?.dailyBudgetGbp ?? 10));
  const locations = input?.locations?.length
    ? input.locations
    : ["United Kingdom", "Ireland", "Australia"];
  const finalUrl = input?.finalUrl?.trim() || FINAL_URL;
  const dateTag = new Date().toISOString().slice(0, 10);

  return {
    version: 1,
    source: "kob_b2b_audit_ads",
    createdAt: new Date().toISOString(),
    campaignName: `KOB · B2B Audit Search · ${dateTag}`,
    finalUrl,
    dailyBudgetGbp,
    locations,
    adGroups: AD_GROUPS.map((g) => ({
      ...g,
      headlines: trimHeadlines(g.headlines),
      descriptions: g.descriptions.map((d) => d.slice(0, 90)),
    })),
    keywords: buildB2bAuditKeywords(),
    negativeKeywords: [
      "jobs",
      "salary",
      "hiring",
      "career",
      "recipe",
      "recipes",
      "diy",
      "wholesale",
      "equipment",
      "franchise cost",
      "near me",
      "delivery near me",
      "menu pdf",
      "open now",
      "reservations near me",
      "uber eats",
      "doordash",
      "student",
      "course",
      "degree",
      "internship",
      // Brand conquest: avoid unrelated "owner" queries
      "business owner",
      "homeowner",
      "pet owner",
      "dog owner",
      "car owner",
      "property owner",
      "owner operator truck",
      "owner finance",
    ],
    notes: [
      "Primary geo: United Kingdom. Also target Ireland + Australia (English, indie dining, lighter Owner.com saturation than US/CA).",
      "Owner brand terms (owner.com / owner com / owner restaurant / owner app) are PHRASE + EXACT only — never broad.",
      "B2B only: restaurant owners — not diners. Lead magnet = trykob.com/audit.",
      "We claim: free audit, website+Google+reviews, daily approve list, credits for site/SEO, from $49 vs Owner ~$249.",
      "We do NOT claim: ordering, delivery, loyalty, AI full-site redesign, or #1 ratings.",
      "Comparative ads: factual price/positioning. If Owner trademark ads disapprove, keep price claims without brand in headlines.",
      "Campaign CSV starts Enabled. Track: audit started + lead captured.",
    ],
  };
}

export function b2bAuditPlanToEditorCsv(plan: B2bAuditAdsPlan): string {
  const rows: string[][] = [];
  rows.push([
    "Campaign",
    "Campaign Type",
    "Campaign Status",
    "Budget",
    "Budget type",
    "Bid Strategy Type",
    "Networks",
    "Location",
    "Ad Group",
    "Ad Group Status",
    "Max CPC",
    "Keyword",
    "Criterion Type",
    "Keyword Status",
    "Headline 1",
    "Headline 2",
    "Headline 3",
    "Description 1",
    "Description 2",
    "Final URL",
    "Path 1",
    "Path 2",
    "Ad type",
    "Ad Status",
  ]);

  const maxCpc = String(Math.max(0.8, Math.min(6, plan.dailyBudgetGbp / 12)).toFixed(2));

  for (const loc of plan.locations) {
    rows.push([
      plan.campaignName,
      "Search",
      "Enabled",
      String(plan.dailyBudgetGbp),
      "Daily",
      "Maximize conversions",
      "Google search",
      loc,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      plan.finalUrl,
      "",
      "",
      "",
      "",
    ]);
  }

  for (const kw of plan.keywords) {
    rows.push([
      plan.campaignName,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      kw.adGroup,
      "Enabled",
      maxCpc,
      kw.text,
      kw.matchType === "EXACT" ? "Exact" : kw.matchType === "PHRASE" ? "Phrase" : "Broad",
      "Enabled",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }

  for (const neg of plan.negativeKeywords) {
    rows.push([
      plan.campaignName,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      neg,
      "Negative",
      "Enabled",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }

  for (const g of plan.adGroups) {
    const h = g.headlines;
    const d = g.descriptions;
    rows.push([
      plan.campaignName,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      g.name,
      "Enabled",
      "",
      "",
      "",
      "",
      h[0] ?? "",
      h[1] ?? "",
      h[2] ?? "",
      d[0] ?? "",
      d[1] ?? "",
      plan.finalUrl,
      g.path1,
      g.path2,
      "Responsive search ad",
      "Enabled",
    ]);
  }

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

export function b2bAuditPlanToMarkdown(plan: B2bAuditAdsPlan): string {
  const byGroup = new Map<string, B2bKeyword[]>();
  for (const k of plan.keywords) {
    const list = byGroup.get(k.adGroup) ?? [];
    list.push(k);
    byGroup.set(k.adGroup, list);
  }

  const lines: string[] = [
    `# ${plan.campaignName}`,
    "",
    "B2B Google Ads Search — restaurant owners → free audit (Owner.com-style lead magnet, KOB claims only).",
    "",
    `- **Final URL:** ${plan.finalUrl}`,
    `- **Daily budget:** £${plan.dailyBudgetGbp}`,
    `- **Locations:** ${plan.locations.join(", ")}`,
    `- **Keywords:** ${plan.keywords.length}`,
    `- **Created:** ${plan.createdAt}`,
    "",
    "## Why this wording",
    "",
    "- Owner.com (Ads Transparency + Meta) leads with **free scan / SEO report / marketing software** → grader.",
    "- We mirror that funnel to **trykob.com/audit**, not ordering/delivery (we don’t sell that stack).",
    "- vs Owner: factual **lower price** ($49 vs ~$249) and **simpler job** — not vague “we’re better at everything.”",
    "",
    "## Seeds included",
    "",
    ...B2B_AUDIT_SEED_KEYWORDS.map((k) => `- \`${k}\``),
    "",
    "## Notes",
    "",
    ...plan.notes.map((n) => `- ${n}`),
    "",
    "## Negatives",
    "",
    plan.negativeKeywords.map((n) => `\`${n}\``).join(", "),
    "",
  ];

  for (const g of plan.adGroups) {
    lines.push(`## Ad group: ${g.name}`, "");
    lines.push("**Headlines**", "");
    for (const h of g.headlines) lines.push(`- ${h}`);
    lines.push("", "**Descriptions**", "");
    for (const d of g.descriptions) lines.push(`- ${d}`);
    lines.push("", "**Keywords**", "");
    for (const k of byGroup.get(g.name) ?? []) {
      lines.push(`- [${k.matchType}] ${k.text}`);
    }
    lines.push("");
  }

  lines.push(
    "## How to launch",
    "",
    "1. Import the CSV in Google Ads Editor.",
    "2. Confirm location, landing = audit, conversions = audit start + lead.",
    "3. Review RSA assets, then upload (campaign exports Enabled).",
    "",
    "Owner references: [Google Ads Transparency](https://adstransparency.google.com/advertiser/AR11510457661166452737?region=anywhere), [Meta Ad Library](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=583616842053401).",
    "",
  );

  return lines.join("\n");
}
