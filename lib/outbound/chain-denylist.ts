/** Chain / franchise signals — exclude from UK cold ICP (independent only). */

const CHAIN_HOSTS = new Set([
  "kfc.com",
  "www.kfc.com",
  "mcdonalds.com",
  "www.mcdonalds.com",
  "mcdonalds.co.uk",
  "www.mcdonalds.co.uk",
  "shakeshack.com",
  "www.shakeshack.com",
  "chipotle.com",
  "www.chipotle.com",
  "dominos.com",
  "www.dominos.com",
  "dominos.co.uk",
  "subway.com",
  "www.subway.com",
  "pizzahut.com",
  "www.pizzahut.com",
  "papajohns.com",
  "www.papajohns.com",
  "nandos.com",
  "www.nandos.com",
  "nandos.co.uk",
  "pret.com",
  "www.pret.com",
  "pret.co.uk",
  "wagamama.com",
  "www.wagamama.com",
  "costa.co.uk",
  "starbucks.com",
  "www.starbucks.com",
  "burgerking.com",
  "www.burgerking.com",
  "fiveguys.com",
  "www.fiveguys.com",
  "pizzaexpress.com",
  "www.pizzaexpress.com",
  "zizzi.com",
  "www.zizzi.com",
  "askitalian.com",
  "www.askitalian.com",
  "harvester.co.uk",
  "tobycarvery.co.uk",
  "beefeater.co.uk",
  "wetherspoon.co.uk",
  "jdwherspoon.co.uk",
  "tortilla.co.uk",
  "www.tortilla.co.uk",
  "leon.co",
  "www.leon.co",
  "itsu.com",
  "www.itsu.com",
  "gailsbread.co.uk",
  "cote.co.uk",
  "dishoom.com",
  "franco-manca.com",
  "honestburgers.co.uk",
  "billssrestaurants.com",
  "tgifridays.com",
  "tgi-fridays.co.uk",
  // Multi-site brands that look "independent" at one location
  "gauchorestaurants.com",
  "gaucho.co.uk",
  "slimchickens.co.uk",
  "slimchickens.com",
  "caprinospizza.co.uk",
  "dixychicken.com",
  "pizzapilgrims.co.uk",
  "watchhouse.com",
  "creamcurls.co.uk",
  "pinkberry.com",
  "www.pinkberry.com",
  "chiquito.co.uk",
  "www.chiquito.co.uk",
  "millerandcarter.co.uk",
  "riospiripiri.com",
  "theivy.com",
  "ivycollection.com",
  "hawksmoor.com",
  "goodmanrestaurants.com",
  "noburestaurants.com",
]);

const CHAIN_NAME_PATTERNS = [
  /\bnando'?s\b/i,
  /\bpret\b/i,
  /\bwagamama\b/i,
  /\bstarbucks\b/i,
  /\bmcdonald'?s?\b/i,
  /\bkfc\b/i,
  /\bsubway\b/i,
  /\bdomino'?s\b/i,
  /\bpizza hut\b/i,
  /\bchipotle\b/i,
  /\bfive guys\b/i,
  /\bpizza express\b/i,
  /\bzizzi\b/i,
  /\bcosta coffee\b/i,
  /\bburger king\b/i,
  /\bwetherspoon\b/i,
  /\bharvester\b/i,
  /\btoby carvery\b/i,
  /\bbeefeater\b/i,
  /\bshake shack\b/i,
  /\btortilla\b/i,
  /\bleon\b/i,
  /\bitsu\b/i,
  /\bgail'?s\b/i,
  /\bcote\b/i,
  /\bdishoom\b/i,
  /\bfranco manca\b/i,
  /\bhonest burger\b/i,
  /\bbill'?s\b/i,
  /\btgi friday'?s?\b/i,
  /\bwaitrose\b/i,
  /\bwhole foods\b/i,
  /\bpizza guys\b/i,
  /\burban greens\b/i,
  /\bslim chickens?\b/i,
  /\bcaprino'?s\b/i,
  /\bdixy chicken\b/i,
  /\bpizza pilgrims?\b/i,
  /\bwatch ?house\b/i,
  /\bcha ?cha ?chai\b/i,
  /\bcream curls\b/i,
  /\bmiller (&|and) carter\b/i,
  /\brio'?s piri piri\b/i,
  /\brios piri piri\b/i,
  /\bpinkberry\b/i,
  /\bchiquito'?s?\b/i,
];

/**
 * Fine dining / elite / premium groups — not SMB independents KOB sells to.
 * Even a single site of these brands is the wrong buyer.
 */
const ELITE_HOSTS = new Set([
  "gauchorestaurants.com",
  "gaucho.co.uk",
  "hawksmoor.com",
  "thehawksmoor.com",
  "goodmanrestaurants.com",
  "noburestaurants.com",
  "zumarestaurant.com",
  "sexyfish.com",
  "theivy.com",
  "ivycollection.com",
  "scotts-restaurant.com",
  "gymkhana.biz",
  "chilternfirehouse.com",
  "sketch.london",
  "duckandwaffle.com",
  "theblueposts.co.uk",
  "grandpacificrestaurant.co.uk",
  "millerandcarter.co.uk",
  "caprice-holdings.com",
]);

const ELITE_NAME_PATTERNS = [
  /\bgaucho\b/i,
  /\bhawksmoor\b/i,
  /\bgoodman\b/i,
  /\bnobu\b/i,
  /\bzuma\b/i,
  /\bsexy fish\b/i,
  /\bthe ivy\b/i,
  /\bivy asia\b/i,
  /\bivy cafe\b/i,
  /\bgymkhana\b/i,
  /\bchiltern firehouse\b/i,
  /\bduck (&|and) waffle\b/i,
  /\bevelyn'?s table\b/i,
  /\bgrand pacific\b/i,
  /\bmiller (&|and) carter\b/i,
  /\bmichelin\b/i,
  /\bfine dining\b/i,
  /\bmerchant steakhouse\b/i,
  /\bcut (&|and) craft\b/i,
];

export function hostFromWebsiteUrl(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isLikelyChainRestaurant(name: string, websiteUrl: string | null): boolean {
  const host = hostFromWebsiteUrl(websiteUrl);
  if (host && (CHAIN_HOSTS.has(host) || CHAIN_HOSTS.has(`www.${host}`))) {
    return true;
  }
  const n = name.trim();
  return CHAIN_NAME_PATTERNS.some((re) => re.test(n));
}

/** Premium / fine-dining / elite groups — wrong ICP even at 1–2 sites. */
export function isEliteOrFineDiningRestaurant(name: string, websiteUrl: string | null): boolean {
  const host = hostFromWebsiteUrl(websiteUrl);
  if (host && (ELITE_HOSTS.has(host) || ELITE_HOSTS.has(`www.${host}`))) {
    return true;
  }
  if (
    websiteUrl &&
    /gauchorestaurants\.com|hawksmoor\.com|theivy\.com|noburestaurants\.com|grandpacificrestaurant\.co\.uk|theblueposts\.co\.uk/i.test(
      websiteUrl,
    )
  ) {
    return true;
  }
  const n = name.trim();
  return ELITE_NAME_PATTERNS.some((re) => re.test(n));
}

/** True if this venue should never enter cold outbound. */
export function isExcludedFromOutboundIcp(name: string, websiteUrl: string | null): boolean {
  return isLikelyChainRestaurant(name, websiteUrl) || isEliteOrFineDiningRestaurant(name, websiteUrl);
}
