export type OnboardRole =
  | "owner"
  | "gm"
  | "chef"
  | "marketing"
  | "ops"
  | "other";

export type OnboardProfile = {
  companyName: string
  role: OnboardRole
  roleLabel: string
  placeId: string | null
  name: string
  area: string
  city: string
  address: string
  website: string | null
  phone: string | null
  cuisine: string
  rating: number | null
  reviewCount: number | null
  photoCount: number | null
  googlePerformance: {
    scoreLabel: string
    summary: string
    recentTone: string
  }
  websiteView: {
    hasSite: boolean
    summary: string
  }
  popularity: {
    peerCount: number
    rankHint: string
    summary: string
  }
  staffEstimate: {
    range: string
    basis: string
  }
  dayToDayFocus: string[]
  likelyIntegrations: string[]
  biggestIssue: {
    id: string
    label: string
    why: string
  }
  otherSignals: string[]
  source: "places" | "heuristic"
};

const ROLE_LABELS: Record<OnboardRole, string> = {
  owner: "Owner",
  gm: "General manager",
  chef: "Chef / kitchen",
  marketing: "Marketing",
  ops: "Ops / multi-site",
  other: "Team",
};

export function normalizeRole(raw: string | undefined | null): OnboardRole {
  const t = (raw ?? "owner").toLowerCase().trim();
  if (t.includes("chef") || t.includes("kitchen")) return "chef";
  if (t.includes("market") || t.includes("social")) return "marketing";
  if (t.includes("gm") || t.includes("manager") || t.includes("general")) return "gm";
  if (t.includes("ops") || t.includes("multi")) return "ops";
  if (t.includes("owner") || t.includes("founder") || t === "") return "owner";
  return "other";
}

export function roleLabel(role: OnboardRole): string {
  return ROLE_LABELS[role];
}

function parseCityArea(address: string): { city: string; area: string } {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      area: parts[parts.length - 3] ?? parts[0] ?? "",
      city: parts[parts.length - 2] ?? parts[parts.length - 1] ?? "",
    };
  }
  return { city: parts[0] ?? "Unknown", area: "" };
}

function googlePerf(rating: number | null, count: number | null, reviews: { rating: number; text: string }[]) {
  const r = rating ?? 0;
  const n = count ?? 0;
  let scoreLabel = "Thin signal";
  if (n >= 80 && r >= 4.5) scoreLabel = "Strong";
  else if (n >= 40 && r >= 4.2) scoreLabel = "Solid";
  else if (n >= 15 && r >= 4.0) scoreLabel = "OK — room to grow";
  else if (n > 0 && r < 4.0) scoreLabel = "At risk";
  else if (n === 0) scoreLabel = "Missing reviews";

  const lows = reviews.filter((x) => x.rating <= 3).length;
  const recentTone =
    reviews.length === 0
      ? "No recent review text pulled."
      : lows >= 2
        ? "Recent notes include service or wait complaints — worth owner eyes."
        : "Recent notes skew positive; keep the tone consistent.";

  const summary =
    n > 0
      ? `${r.toFixed(1)}★ from ${n.toLocaleString()} Google reviews — ${scoreLabel.toLowerCase()}.`
      : "No public Google rating found yet — listing watch is the first job.";

  return { scoreLabel, summary, recentTone };
}

function websiteView(website: string | null) {
  if (!website) {
    return {
      hasSite: false,
      summary:
        "No website on the listing. Guests hit Google only — hours and menu drift risk is high.",
    };
  }
  const host = website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const looksThin = /wixsite|squarespace|linktr|instagram|facebook|bit\.ly/i.test(host);
  return {
    hasSite: true,
    summary: looksThin
      ? `Site looks like a light builder page (${host}). Check mobile menu, hours match, and book CTA.`
      : `Public site on file (${host}). KOB will watch hours vs Google and menu freshness.`,
  };
}

function popularity(
  rating: number | null,
  count: number | null,
  peers: { rating: number | null; userRatingCount: number | null }[],
) {
  const n = count ?? 0;
  const peerCount = peers.length;
  const peerAvg =
    peers.length > 0
      ? peers.reduce((s, p) => s + (p.userRatingCount ?? 0), 0) / peers.length
      : 0;
  let rankHint = "Unknown vs peers";
  if (peerCount >= 3 && peerAvg > 0) {
    if (n > peerAvg * 1.25) rankHint = "Above local peer review volume";
    else if (n < peerAvg * 0.6) rankHint = "Quieter than nearby rooms";
    else rankHint = "In line with nearby peers";
  } else if (n >= 100) rankHint = "Busy listing for its city";
  else if (n < 20) rankHint = "Low review velocity";

  return {
    peerCount,
    rankHint,
    summary:
      peerCount >= 3
        ? `${rankHint} (~${Math.round(peerAvg)} reviews avg across ${peerCount} nearby). Your count: ${n}.`
        : `${rankHint}. Rating ${rating?.toFixed(1) ?? "—"}★ · ${n} reviews.`,
  };
}

function staffEstimate(count: number | null, cuisine: string) {
  const n = count ?? 0;
  let range = "8–18";
  let basis = "Typical independent floor + kitchen for this review volume.";
  if (n >= 400 || /hotel|group|chain/i.test(cuisine)) {
    range = "25–60+";
    basis = "High review volume / group signal — multi-shift FOH and kitchen.";
  } else if (n >= 120) {
    range = "12–28";
    basis = "Busy independent — likely dual-shift.";
  } else if (n < 25) {
    range = "4–12";
    basis = "Smaller room or newer listing — lean team assumption.";
  }
  return { range, basis };
}

function dayFocus(role: OnboardRole, biggest: string): string[] {
  const common = [
    "Approve anything public (hours, reviews, posts)",
    "One morning pass on Google vs the site",
  ];
  if (role === "chef") {
    return [
      "Delivery notes vs house rate",
      "Prep cuts when weather hits covers",
      "Waste vs dishes sold",
      ...common.slice(0, 1),
    ];
  }
  if (role === "marketing") {
    return [
      "Review tone and reply queue",
      "Listing photos and Google posts",
      "Site menu / offer accuracy",
      ...common,
    ];
  }
  if (role === "gm" || role === "ops") {
    return [
      "Hours drift across Google, site, booker",
      "Service complaints escalated to you",
      biggest === "food_waste" ? "Kitchen variance flags" : "Cover / booking gaps",
      ...common,
    ];
  }
  // owner default
  return [
    "Biggest leak first — " + biggest.replace(/_/g, " "),
    "Hours and reviews before open",
    "Invoice / waste flags before they hit the till",
    "Stay on the floor — approve only",
  ];
}

function integrations(hasSite: boolean, peerBusy: boolean): string[] {
  const list = ["Google Business Profile", "Email inbox"];
  if (hasSite) list.push("Website CMS / site URL");
  list.push("Invoice photo (camera)", "Weather");
  if (peerBusy) list.push("OpenTable / Resy / SevenRooms (likely)", "Till / POS (Square, Lightspeed, Toast — likely)");
  else list.push("Till / POS (likely)", "Bookings tool (maybe)");
  list.push("WhatsApp (Soon)", "Delivery apps (Soon)");
  return list;
}

function biggestIssue(input: {
  rating: number | null
  reviewCount: number | null
  hasSite: boolean
  lowReviews: number
  peerQuiet: boolean
}): { id: string; label: string; why: string } {
  const { rating, reviewCount, hasSite, lowReviews, peerQuiet } = input;
  const n = reviewCount ?? 0;
  const r = rating ?? 0;

  if (!hasSite) {
    return {
      id: "branding",
      label: "Online presence / branding",
      why: "No website on the listing — the brand story stops at Google.",
    };
  }
  if (n > 0 && r > 0 && r < 4.0) {
    return {
      id: "footfall",
      label: "Reputation hurting footfall",
      why: `${r.toFixed(1)}★ pulls guests away before they book.`,
    };
  }
  if (lowReviews >= 2) {
    return {
      id: "service",
      label: "Service consistency",
      why: "Recent lower-star notes point at waits or floor issues.",
    };
  }
  if (peerQuiet || n < 30) {
    return {
      id: "footfall",
      label: "Discovery / footfall",
      why: "Review velocity is soft vs a healthy local room — fewer public proof points.",
    };
  }
  if (n >= 80 && r >= 4.4) {
    return {
      id: "food_waste",
      label: "Kitchen cost / food waste",
      why: "Listing looks healthy — margin leaks (invoice vs covers, weather prep) are the next money.",
    };
  }
  return {
    id: "online_delivery",
    label: "Channel mix / online demand",
    why: "Solid room signal — watch third-party delivery margin and direct booking paths.",
  };
}

export function buildOnboardProfile(args: {
  companyName: string
  role: OnboardRole
  place: {
    placeId: string
    name: string
    formattedAddress: string
    websiteUri: string | null
    phoneNumber: string | null
  } | null
  enrichment: {
    rating: number | null
    reviewCount: number | null
    photoCount: number
    reviews: { rating: number; text: string }[]
  } | null
  peers: { rating: number | null; userRatingCount: number | null }[]
  cuisine: string
  source: "places" | "heuristic"
}): OnboardProfile {
  const role = args.role;
  const place = args.place;
  const enr = args.enrichment;
  const { city, area } = parseCityArea(place?.formattedAddress ?? "");
  const rating = enr?.rating ?? null;
  const reviewCount = enr?.reviewCount ?? null;
  const reviews = enr?.reviews ?? [];
  const hasSite = Boolean(place?.websiteUri);
  const googlePerformance = googlePerf(rating, reviewCount, reviews);
  const site = websiteView(place?.websiteUri ?? null);
  const pop = popularity(rating, reviewCount, args.peers);
  const staff = staffEstimate(reviewCount, args.cuisine);
  const lowReviews = reviews.filter((r) => r.rating <= 3).length;
  const peerQuiet = pop.rankHint.includes("Quieter") || pop.rankHint.includes("Low");
  const issue = biggestIssue({
    rating,
    reviewCount,
    hasSite,
    lowReviews,
    peerQuiet,
  });
  const focus = dayFocus(role, issue.id);
  const likelyIntegrations = integrations(hasSite, (reviewCount ?? 0) >= 80);

  const otherSignals: string[] = [];
  if ((enr?.photoCount ?? 0) < 5) otherSignals.push("Listing photos look thin — guest trust suffers.");
  if (hasSite && !place?.phoneNumber) otherSignals.push("Phone missing on Places — call conversions leak.");
  if ((reviewCount ?? 0) >= 50 && lowReviews === 0) {
    otherSignals.push("Few public complaints — protect the tone; don’t over-automate.");
  }
  otherSignals.push(`Default: you are the ${roleLabel(role).toLowerCase()} — KOB prepares, you approve.`);

  return {
    companyName: args.companyName,
    role,
    roleLabel: roleLabel(role),
    placeId: place?.placeId ?? null,
    name: place?.name ?? args.companyName,
    area: area || city,
    city: city || "Unknown",
    address: place?.formattedAddress ?? "",
    website: place?.websiteUri ?? null,
    phone: place?.phoneNumber ?? null,
    cuisine: args.cuisine || "Independent restaurant",
    rating,
    reviewCount,
    photoCount: enr?.photoCount ?? null,
    googlePerformance,
    websiteView: site,
    popularity: pop,
    staffEstimate: staff,
    dayToDayFocus: focus,
    likelyIntegrations,
    biggestIssue: issue,
    otherSignals,
    source: args.source,
  };
}
