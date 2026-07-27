/**
 * Prove a candidate website actually belongs to the named restaurant.
 * Prevents domain-guess false positives (e.g. "Kingsway Karahi" → kingsway.com surface-care).
 */

export type WebsiteIdentityResult = {
  matched: boolean;
  score: number;
  reason: string;
  hasHospitalityCue: boolean;
  hasNegativeIndustryCue: boolean;
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "at",
  "in",
  "of",
  "ltd",
  "limited",
  "uk",
  "restaurant",
  "takeaway",
  "cafe",
  "bar",
  "grill",
  "kitchen",
]);

/** Industrial / B2B pages that are never a restaurant website. */
const NEGATIVE_INDUSTRY_RE =
  /\b(surface care|flooring|carpet|tile adhesive|chemical|industrial|wholesale|manufacturer|b2b|cleaning product|facade|sealant|resin floor|epoxy|janitorial|hygiene supply)\b/i;

/** Design / marketing agencies wrongly attached via name collision (e.g. Subraa). Always reject. */
const DESIGN_AGENCY_RE =
  /\b(web\s*design|web\s*designer|web\s*developer|freelance\s+(web|logo|graphic)|logo\s*design|seo\s*agency|seo\s*company|digital\s*marketing\s*(agency|services?)|graphic\s*design|name\s*card\s*design|flyer\s*design|brochure\s*design|singapore\s*web\s*design|website\s*design\s*(company|singapore|sg))\b/i;

const HOSPITALITY_CUE_RE =
  /\b(restaurant|takeaway|take-away|menu|reserv|book a table|table booking|opening hours|cuisine|indian|pakistani|chinese|thai|pizza|kebab|burger|sushi|delivery|order online|allergen|halal|byo|dine[- ]?in|our dishes|starters|mains)\b/i;

const PARKED_PAGE_RE =
  /domain for sale|buy this domain|parked free|godaddy|sedo\.com|hugedomains|is for sale|coming soon/i;

const MIN_ACCEPT_SCORE = 55;

export function websiteIdentityMinScore(): number {
  return MIN_ACCEPT_SCORE;
}

export function nameTokensForIdentity(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/24\s*\/\s*7/g, "247")
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function compactSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/24\s*\/\s*7/g, "247")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Score how well fetched HTML matches the restaurant. Callers must treat
 * `matched: false` as "do not use this URL for a restaurant audit".
 */
export function scoreWebsiteIdentity(input: {
  restaurantName: string;
  city: string;
  url: string;
  html: string;
}): WebsiteIdentityResult {
  const { restaurantName, city, url, html } = input;
  if (html.length < 800) {
    return {
      matched: false,
      score: -100,
      reason: "Page too thin to verify ownership",
      hasHospitalityCue: false,
      hasNegativeIndustryCue: false,
    };
  }
  if (PARKED_PAGE_RE.test(html)) {
    return {
      matched: false,
      score: -1000,
      reason: "Parked or for-sale domain page",
      hasHospitalityCue: false,
      hasNegativeIndustryCue: false,
    };
  }

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.toLowerCase() ?? "";
  const body = html.slice(0, 80_000).toLowerCase();
  const haystack = `${title}\n${body}`;
  const tokens = nameTokensForIdentity(restaurantName);
  const cityCompact = compactSlug(city);
  const nameCompact = compactSlug(restaurantName);
  const hasHospitalityCue = HOSPITALITY_CUE_RE.test(haystack);
  const hasNegativeIndustryCue = NEGATIVE_INDUSTRY_RE.test(haystack);
  const hasDesignAgencyCue = DESIGN_AGENCY_RE.test(haystack);

  if (hasDesignAgencyCue) {
    return {
      matched: false,
      score: -1000,
      reason: "Page is a web design / marketing agency — not a restaurant website",
      hasHospitalityCue,
      hasNegativeIndustryCue: true,
    };
  }

  let score = 0;
  const reasons: string[] = [];

  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/\.(co\.uk|uk|com)$/, "");
    if (nameCompact.length >= 6 && host.includes(nameCompact)) {
      score += 50;
      reasons.push("host matches full name");
    } else if (tokens.length >= 2) {
      const joined = compactSlug(tokens.slice(0, 2).join(""));
      if (joined.length >= 5 && host.includes(joined)) {
        score += 35;
        reasons.push("host matches name pair");
      }
    }
  } catch {
    /* ignore */
  }

  let tokensInTitle = 0;
  let tokensInBody = 0;
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (title.includes(token)) {
      score += 22;
      tokensInTitle += 1;
    } else if (body.includes(token)) {
      score += 8;
      tokensInBody += 1;
    }
  }

  if (cityCompact.length >= 3 && city.toLowerCase() !== "your area") {
    if (body.includes(city.toLowerCase()) || body.includes(cityCompact) || title.includes(cityCompact)) {
      score += 18;
      reasons.push("city present");
    }
  }

  if (hasHospitalityCue) {
    score += 25;
    reasons.push("hospitality cues");
  }

  if (hasNegativeIndustryCue && !hasHospitalityCue) {
    return {
      matched: false,
      score: -500,
      reason: "Page looks like a non-restaurant business (industrial / B2B / surface-care)",
      hasHospitalityCue,
      hasNegativeIndustryCue,
    };
  }

  // Distinctive multi-token names: require more than the first brand word.
  // "Kingsway Karahi" must not accept a page that only mentions "Kingsway".
  if (tokens.length >= 2) {
    const distinctive = tokens.filter((t) => t.length >= 4);
    const hitDistinctive = distinctive.filter((t) => title.includes(t) || body.includes(t));
    if (hitDistinctive.length < Math.min(2, distinctive.length) && !hasHospitalityCue) {
      return {
        matched: false,
        score: Math.min(score, 20),
        reason: `Only partial name match (${hitDistinctive.join(", ") || "none"}); missing ${distinctive
          .filter((t) => !hitDistinctive.includes(t))
          .slice(0, 3)
          .join(", ")}`,
        hasHospitalityCue,
        hasNegativeIndustryCue,
      };
    }
    // With hospitality cues, allow a strong single distinctive token (e.g. "ZAN ASIAN …").
    if (
      hasHospitalityCue &&
      hitDistinctive.length === 0 &&
      distinctive.every((t) => !title.includes(t) && !body.includes(t))
    ) {
      return {
        matched: false,
        score: Math.min(score, 25),
        reason: "Hospitality page found, but restaurant name tokens are missing",
        hasHospitalityCue,
        hasNegativeIndustryCue,
      };
    }
  }

  if (tokens.length <= 1 && score < 40) {
    return {
      matched: false,
      score: -100,
      reason: "Single-token name without strong host/title proof",
      hasHospitalityCue,
      hasNegativeIndustryCue,
    };
  }

  const matched =
    (score >= MIN_ACCEPT_SCORE && (hasHospitalityCue || tokensInTitle + tokensInBody >= 2)) ||
    // Real restaurant sites often score mid-40s with clear hospitality copy + at least one name token.
    (hasHospitalityCue && score >= 45 && tokensInTitle + tokensInBody >= 1);

  return {
    matched,
    score,
    reason: matched
      ? `Verified (${reasons.join(", ") || "name match"}; score ${score})`
      : `Weak restaurant↔site match (score ${score}; ${reasons.join(", ") || "insufficient signals"})`,
    hasHospitalityCue,
    hasNegativeIndustryCue,
  };
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Fetch homepage and verify it belongs to the restaurant. */
export async function verifyWebsiteMatchesRestaurant(input: {
  restaurantName: string;
  city: string;
  websiteUrl: string;
  timeoutMs?: number;
}): Promise<WebsiteIdentityResult & { finalUrl: string }> {
  const timeoutMs = input.timeoutMs ?? 4_000;
  let finalUrl = input.websiteUrl;
  try {
    const res = await fetch(input.websiteUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    finalUrl = res.url || input.websiteUrl;
    if (!res.ok) {
      return {
        matched: false,
        score: -100,
        reason: `Website returned HTTP ${res.status}`,
        hasHospitalityCue: false,
        hasNegativeIndustryCue: false,
        finalUrl,
      };
    }
    const html = await res.text();
    if (/checking your browser|cf-browser-verification|just a moment/i.test(html)) {
      return {
        matched: false,
        score: -50,
        reason: "Website blocked bot fetch — cannot verify ownership",
        hasHospitalityCue: false,
        hasNegativeIndustryCue: false,
        finalUrl,
      };
    }
    return { ...scoreWebsiteIdentity({ ...input, url: finalUrl, html }), finalUrl };
  } catch {
    return {
      matched: false,
      score: -100,
      reason: "Website fetch failed — cannot verify ownership",
      hasHospitalityCue: false,
      hasNegativeIndustryCue: false,
      finalUrl,
    };
  }
}

/** Score from already-captured title/meta when full HTML is not available. */
export function scoreWebsiteIdentityFromSnippets(input: {
  restaurantName: string;
  city: string;
  url: string | null;
  titleSnippet: string | null;
  metaDescriptionSnippet: string | null;
}): WebsiteIdentityResult {
  const title = (input.titleSnippet ?? "").toLowerCase();
  const meta = (input.metaDescriptionSnippet ?? "").toLowerCase();
  const html = `<title>${title}</title><body>${meta} ${title} ${"x".repeat(900)}</body>`;
  return scoreWebsiteIdentity({
    restaurantName: input.restaurantName,
    city: input.city,
    url: input.url || "https://example.invalid/",
    html,
  });
}
