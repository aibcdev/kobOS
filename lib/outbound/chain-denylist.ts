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
