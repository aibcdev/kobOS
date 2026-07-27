/**
 * Audit Instagram handles: last ~5 posts must look like a food/hospitality page.
 * Source: imginn.com mirror (public captions/alts). Clear matches with zero food posts.
 */

import { normalizeInstagramUrl } from "@/lib/lead-engine/discover-instagram";

const FOOD_RE =
  /\b(pizza|pasta|food|foods|menu|menus|dish|dishes|burger|burgers|curry|curries|restaurant|restaurants|lunch|dinner|brunch|breakfast|sushi|ramen|kebab|kebabs|grill|grilled|chef|kitchen|takeaway|takeaway|take-out|takeout|cuisine|homemade|home-made|dessert|desserts|bakery|bread|coffee|cafe|café|cocktail|cocktails|wine|beer|tasting|specials?|starter|starters|mains?|sides?|booking|reservation|reservations|open\s+today|serving|served|eat|eats|dining|dine|table|tables|order\s+online|delivery|halal|vegan|vegetarian|seafood|steak|noodles?|risotto|tiramisu|gelato|gelati|panini|wrap|wraps|salad|soups?|tapas|mezze|biryani|tandoori|shawarma|falafel|noodles?)\b/i;

const FOOD_EMOJI_RE = /[🍕🍝🍔🍟🍣🍜🥗☕🍷🍹🍰🧁🍦🍩🥩🍗🐟🦐🧀🥖]/u;

const NON_FOOD_STRONG_RE =
  /\b(concert|gig|tour|album|band|tickets?\s+are\s+live|live\s+music|festival|merch|vinyl|single\s+out\s+now|spotify|soundcloud|episode\s+#?\d+|podcast|webinar|crypto|nft|insurance|solicitor|dentist|salon|barber)\b/i;

export type InstagramFoodAudit = {
  handle: string;
  url: string;
  ok: boolean;
  reason: string;
  foodPosts: number;
  postsChecked: number;
  posts: string[];
  source: "imginn" | "none";
};

let lastFetchMs = 0;
let fetchChain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimitImginn() {
  const gap = Math.max(
    1500,
    Number(process.env.LEAD_ENGINE_IG_FOOD_GAP_MS?.trim() || "2200") || 2200,
  );
  const run = fetchChain.then(async () => {
    const wait = lastFetchMs + gap - Date.now();
    if (wait > 0) await sleep(wait);
    lastFetchMs = Date.now();
  });
  fetchChain = run.catch(() => {});
  await run;
}

function postLooksLikeFood(text: string): boolean {
  if (!text.trim()) return false;
  if (FOOD_RE.test(text) || FOOD_EMOJI_RE.test(text)) return true;
  return false;
}

function extractPostTexts(html: string, handle: string): string[] {
  const alts = [...html.matchAll(/alt="([^"]{5,400})"/gi)]
    .map((m) =>
      m[1]!
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#38;/g, "&")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((a) => {
      if (/avatar|profile picture|back to up/i.test(a)) return false;
      if (/^by @/i.test(a)) return false;
      return true;
    });

  const handleRe = new RegExp(`@${handle}\\b`, "i");
  const posts: string[] = [];
  for (const a of alts) {
    // Prefer captions that reference the account or look like real post text
    if (handleRe.test(a) || /taken in /i.test(a) || a.length >= 40 || FOOD_EMOJI_RE.test(a)) {
      const cleaned = a.replace(new RegExp(`\\s*by @${handle}\\s*$`, "i"), "").trim();
      if (cleaned.length >= 8) posts.push(cleaned);
    }
    if (posts.length >= 5) break;
  }

  // Fallback: any remaining substantial alts
  if (posts.length < 3) {
    for (const a of alts) {
      if (posts.includes(a) || a.length < 20) continue;
      posts.push(a);
      if (posts.length >= 5) break;
    }
  }

  return posts.slice(0, 5);
}

async function fetchImginnHtml(handle: string): Promise<string | null> {
  await rateLimitImginn();
  try {
    const res = await fetch(`https://imginn.com/${handle}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: "https://imginn.com/",
      },
      signal: AbortSignal.timeout(18_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 8_000) return null; // blocked / empty
    return html;
  } catch {
    return null;
  }
}

/**
 * Returns ok:false when the last posts show no food/hospitality content.
 * Fail-open (ok:true, reason unavailable) when the mirror is blocked — don't mass-delete on fetch failure.
 */
export async function auditInstagramFoodPage(
  instagramUrl: string,
): Promise<InstagramFoodAudit> {
  const norm = normalizeInstagramUrl(instagramUrl);
  if (!norm) {
    return {
      handle: "",
      url: instagramUrl,
      ok: false,
      reason: "invalid_url",
      foodPosts: 0,
      postsChecked: 0,
      posts: [],
      source: "none",
    };
  }

  const html = await fetchImginnHtml(norm.handle);
  if (!html) {
    return {
      handle: norm.handle,
      url: norm.url,
      ok: true,
      reason: "imginn_unavailable",
      foodPosts: 0,
      postsChecked: 0,
      posts: [],
      source: "none",
    };
  }

  const posts = extractPostTexts(html, norm.handle);
  if (!posts.length) {
    return {
      handle: norm.handle,
      url: norm.url,
      ok: true,
      reason: "no_posts_parsed",
      foodPosts: 0,
      postsChecked: 0,
      posts: [],
      source: "imginn",
    };
  }

  let foodPosts = 0;
  let nonFoodStrong = 0;
  for (const p of posts) {
    if (postLooksLikeFood(p)) foodPosts += 1;
    else if (NON_FOOD_STRONG_RE.test(p)) nonFoodStrong += 1;
  }

  // User rule: no food in last 5 posts → wrong match
  if (foodPosts === 0) {
    return {
      handle: norm.handle,
      url: norm.url,
      ok: false,
      reason: nonFoodStrong > 0 ? "no_food_posts_nonfood_signals" : "no_food_in_last_posts",
      foodPosts: 0,
      postsChecked: posts.length,
      posts,
      source: "imginn",
    };
  }

  return {
    handle: norm.handle,
    url: norm.url,
    ok: true,
    reason: "food_posts_ok",
    foodPosts,
    postsChecked: posts.length,
    posts,
    source: "imginn",
  };
}
