/**
 * Local Google Ads campaign planner for restaurants.
 * Uses Places geo + nearby venues to build Search/Local plans and Ads Editor CSV.
 * Live Ads API publish is separate (needs linked Ads account).
 */

import { placesGeocodeCityUk, placesSearchNearbyRestaurants } from "@/lib/places/google-places-server";

export type LocalAdsGoal = "covers" | "takeaway" | "brand";

export type LocalAdsKeyword = {
  text: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
  intent: "core" | "near_me" | "cuisine" | "competitor_conquest" | "brand";
};

export type LocalAdsPlan = {
  version: 1;
  source: "demand_engine_google_ads_local";
  createdAt: string;
  restaurantName: string;
  cuisine: string;
  areaLabel: string;
  radiusKm: number;
  dailyBudgetGbp: number;
  goal: LocalAdsGoal;
  geo: { lat: number; lng: number; placeId?: string };
  campaignName: string;
  adGroupName: string;
  finalUrl: string;
  phone?: string;
  keywords: LocalAdsKeyword[];
  negativeKeywords: string[];
  headlines: string[];
  descriptions: string[];
  nearbyVenues: Array<{ name: string; rating: number | null }>;
  estimatedMonthlySpendGbp: number;
  notes: string[];
};

function uniqueStrings(items: string[], max = 40): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildKeywordSet(input: {
  restaurantName: string;
  cuisine: string;
  areaLabel: string;
  goal: LocalAdsGoal;
  nearbyNames: string[];
}): LocalAdsKeyword[] {
  const cuisine = input.cuisine.trim() || "restaurant";
  const area = input.areaLabel.trim();
  const name = input.restaurantName.trim();
  const core: LocalAdsKeyword[] = [
    { text: `${cuisine} near me`, matchType: "PHRASE", intent: "near_me" },
    { text: `best ${cuisine} near me`, matchType: "PHRASE", intent: "near_me" },
    { text: `${cuisine} in ${area}`, matchType: "PHRASE", intent: "cuisine" },
    { text: `restaurants in ${area}`, matchType: "PHRASE", intent: "core" },
    { text: `${area} ${cuisine}`, matchType: "BROAD", intent: "cuisine" },
    { text: name, matchType: "EXACT", intent: "brand" },
    { text: `${name} ${area}`, matchType: "PHRASE", intent: "brand" },
  ];

  if (input.goal === "takeaway") {
    core.push(
      { text: `takeaway ${cuisine} ${area}`, matchType: "PHRASE", intent: "core" },
      { text: `order ${cuisine} near me`, matchType: "PHRASE", intent: "near_me" },
      { text: `${cuisine} delivery ${area}`, matchType: "PHRASE", intent: "core" },
    );
  } else if (input.goal === "covers") {
    core.push(
      { text: `${cuisine} restaurant ${area}`, matchType: "PHRASE", intent: "core" },
      { text: `book ${cuisine} ${area}`, matchType: "PHRASE", intent: "core" },
      { text: `dinner near me`, matchType: "PHRASE", intent: "near_me" },
    );
  } else {
    core.push(
      { text: `${name} menu`, matchType: "PHRASE", intent: "brand" },
      { text: `${name} reviews`, matchType: "PHRASE", intent: "brand" },
    );
  }

  for (const n of input.nearbyNames.slice(0, 3)) {
    if (n.toLowerCase() === name.toLowerCase()) continue;
    core.push({
      text: `${n} alternative`,
      matchType: "PHRASE",
      intent: "competitor_conquest",
    });
  }

  const seen = new Set<string>();
  return core.filter((k) => {
    const key = `${k.matchType}:${k.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAdCopy(input: {
  restaurantName: string;
  cuisine: string;
  areaLabel: string;
  goal: LocalAdsGoal;
  promoHeadline?: string;
}): { headlines: string[]; descriptions: string[] } {
  const { restaurantName: name, cuisine, areaLabel: area, goal, promoHeadline } = input;
  const headlines = uniqueStrings(
    [
      promoHeadline?.slice(0, 30),
      name.slice(0, 30),
      `${cuisine} in ${area}`.slice(0, 30),
      `Book ${name}`.slice(0, 30),
      goal === "takeaway" ? "Order Takeaway Today" : "Reserve a Table Tonight",
      `Top ${cuisine} Near You`.slice(0, 30),
      `${area} Dining`.slice(0, 30),
      "Open Now · Local Favourite",
      goal === "brand" ? "See Menu & Reviews" : "Limited Local Offer",
      "Walk-ins Welcome",
      "Fresh · Local · Loved",
      `Visit ${name}`.slice(0, 30),
      "Tables Available",
      "Dine In Nearby",
      "Google Guests Love Us",
    ].filter(Boolean) as string[],
    15,
  );

  const descriptions = uniqueStrings(
    [
      goal === "takeaway"
        ? `Order ${cuisine} from ${name} in ${area}. Fast pickup or delivery — order online now.`
        : `Discover ${name} in ${area}. Great ${cuisine}, warm service — book your table today.`,
      promoHeadline
        ? `${promoHeadline}. Local diners in ${area} — claim your offer while it lasts.`
        : `Looking for ${cuisine} near you? ${name} is a local favourite in ${area}.`,
      `Find us on Google Maps in ${area}. See the menu, reviews, and directions in one tap.`,
      goal === "brand"
        ? `${name} — authentic ${cuisine} in ${area}. Explore the menu and plan your visit.`
        : `Hungry in ${area}? ${name} serves standout ${cuisine}. Book now or walk in tonight.`,
    ],
    4,
  ).map((d) => d.slice(0, 90));

  return { headlines, descriptions };
}

export async function planLocalGoogleAdsCampaign(input: {
  restaurantName: string;
  cuisine?: string | null;
  area: string;
  radiusKm?: number;
  dailyBudgetGbp?: number;
  goal?: LocalAdsGoal;
  website?: string | null;
  phone?: string | null;
  promoHeadline?: string | null;
}): Promise<LocalAdsPlan> {
  const area = input.area.trim();
  if (!area) throw new Error("Area is required (city, neighbourhood, or postcode)");

  const cuisine = (input.cuisine?.trim() || "restaurant").toLowerCase();
  const radiusKm = Math.min(40, Math.max(1, input.radiusKm ?? 5));
  const dailyBudgetGbp = Math.min(500, Math.max(5, Math.round((input.dailyBudgetGbp ?? 20) * 100) / 100));
  const goal = input.goal ?? "covers";
  const name = input.restaurantName.trim() || "Restaurant";

  const geo = await placesGeocodeCityUk(area, name);
  if (!geo) {
    throw new Error(
      `Could not locate “${area}” via Google Places. Try a clearer city or postcode (Places API key required).`,
    );
  }

  const nearby = await placesSearchNearbyRestaurants(geo.lat, geo.lng, name, 8);
  const keywords = buildKeywordSet({
    restaurantName: name,
    cuisine,
    areaLabel: geo.city || area,
    goal,
    nearbyNames: nearby.map((n) => n.name),
  });
  const { headlines, descriptions } = buildAdCopy({
    restaurantName: name,
    cuisine,
    areaLabel: geo.city || area,
    goal,
    promoHeadline: input.promoHeadline?.trim() || undefined,
  });

  const dateTag = new Date().toISOString().slice(0, 10);
  const campaignName = `${name} · Local Search · ${geo.city || area} · ${dateTag}`.slice(0, 120);
  const finalUrl =
    (input.website?.trim() || "").replace(/\/$/, "") ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${geo.city || area}`)}`;

  const notes = [
    `Target a ${radiusKm} km radius around ${geo.city || area} (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}).`,
    "Import the CSV into Google Ads Editor, then review location targeting + conversion tracking before upload.",
    "Link Google Business Profile and enable call / direction extensions for local intent.",
    nearby.length
      ? `Nearby competition sampled: ${nearby
          .slice(0, 4)
          .map((n) => n.name)
          .join(", ")}.`
      : "No nearby venues returned — keywords still use area + cuisine intent.",
  ];

  return {
    version: 1,
    source: "demand_engine_google_ads_local",
    createdAt: new Date().toISOString(),
    restaurantName: name,
    cuisine,
    areaLabel: geo.city || area,
    radiusKm,
    dailyBudgetGbp,
    goal,
    geo: { lat: geo.lat, lng: geo.lng, placeId: geo.placeId },
    campaignName,
    adGroupName: `${cuisine} · ${goal} · local`,
    finalUrl,
    phone: input.phone?.trim() || undefined,
    keywords,
    negativeKeywords: uniqueStrings([
      "jobs",
      "salary",
      "recipe",
      "diy",
      "wholesale",
      "franchise cost",
      "equipment",
      "hiring",
    ]),
    headlines,
    descriptions,
    nearbyVenues: nearby.map((n) => ({ name: n.name, rating: n.rating })),
    estimatedMonthlySpendGbp: Math.round(dailyBudgetGbp * 30),
    notes,
  };
}

/** Google Ads Editor–friendly CSV (Search campaign + keywords + RSA rows). */
export function localAdsPlanToEditorCsv(plan: LocalAdsPlan): string {
  const rows: string[][] = [];
  const header = [
    "Campaign",
    "Campaign Type",
    "Campaign Status",
    "Budget",
    "Budget type",
    "Bid Strategy Type",
    "Networks",
    "Location",
    "Radius",
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
    "Ad type",
    "Ad Status",
  ];
  rows.push(header);

  const location = `${plan.geo.lat}, ${plan.geo.lng}`;
  const radius = `${plan.radiusKm}km`;
  const budget = String(plan.dailyBudgetGbp);
  const maxCpc = String(Math.max(0.5, Math.min(4, plan.dailyBudgetGbp / 15)).toFixed(2));

  // Campaign + location row
  rows.push([
    plan.campaignName,
    "Search",
    "Paused",
    budget,
    "Daily",
    "Maximize clicks",
    "Google search",
    location,
    radius,
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
  ]);

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
      "",
      plan.adGroupName,
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
    ]);
  }

  const h = plan.headlines;
  const d = plan.descriptions;
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
    plan.adGroupName,
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
    plan.areaLabel.slice(0, 15),
    "Responsive search ad",
    "Paused",
  ]);

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}
