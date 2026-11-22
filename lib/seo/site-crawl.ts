/**
 * Our own site crawl, in place of Screaming Frog: one row of on-page facts per URL, read from the raw server HTML
 * (what search engines and assistants that don't run JavaScript see).
 */

export type PageFacts = {
  url: string;
  path: string;
  status: number;
  /** Where a 3xx points, as a path on the same host or a full URL. */
  redirectTo: string | null;
  canonical: string | null;
  noindex: boolean;
  title: string;
  description: string;
  h1: string[];
  firstH2: string;
  words: number;
  /** Same-host paths this page links to, de-duplicated. */
  links: string[];
  jsonLdTypes: string[];
  unlabelledInputs: number;
  hasMain: boolean;
  /** Link depth from the start page; -1 when only the sitemap lists it. */
  depth: number;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'", apos: "'", nbsp: " " };

export function decode(text: string): string {
  return text
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      const key = e.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const stripTags = (html: string) => decode(html.replace(/<[^>]+>/g, " "));

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : null;
}

function metaContent(html: string, key: "name" | "property", value: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attr(tag, key)?.toLowerCase() === value) return attr(tag, "content");
  }
  return null;
}

/** The path for a same-host href, without query or hash; null for other hosts, mailto:, tel: and the like. */
export function internalPath(href: string, pageUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(href, pageUrl);
  } catch {
    return null;
  }
  const page = new URL(pageUrl);
  if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, "") !== page.hostname.replace(/^www\./, "")) return null;
  const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
  return path || "/";
}

/** On-page facts from raw HTML. Status, redirect and depth are filled in by the crawler. */
export function parsePage(html: string, url: string): Omit<PageFacts, "status" | "redirectTo" | "depth"> {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const canonicalTag = (html.match(/<link\b[^>]*>/gi) ?? []).find((t) => attr(t, "rel")?.toLowerCase() === "canonical");
  const robots = [metaContent(html, "name", "robots"), metaContent(html, "name", "googlebot")].filter(Boolean).join(",");

  const jsonLdTypes = new Set<string>();
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) jsonLdTypes.add(t[1]);
  }

  const labelled = new Set((body.match(/<label\b[^>]*>/gi) ?? []).map((t) => attr(t, "for")).filter(Boolean));
  let unlabelledInputs = 0;
  for (const tag of body.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []) {
    const type = (attr(tag, "type") ?? "text").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    const id = attr(tag, "id");
    if (attr(tag, "aria-label") || attr(tag, "aria-labelledby") || (id && labelled.has(id))) continue;
    unlabelledInputs++;
  }
  // Inputs wrapped in a <label> count as labelled.
  for (const m of body.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)) {
    unlabelledInputs -= (m[1].match(/<(input|select|textarea)\b/gi) ?? []).length;
  }

  const links = new Set<string>();
  for (const tag of body.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href");
    const path = href ? internalPath(href, url) : null;
    if (path) links.add(path);
  }

  const bodyText = stripTags(body.replace(/<head\b[\s\S]*?<\/head>/i, " "));
  return {
    url,
    path: new URL(url).pathname.replace(/(.)\/+$/, "$1"),
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    noindex: /noindex/i.test(robots),
    title: stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: metaContent(html, "name", "description") ?? "",
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])),
    firstH2: stripTags(body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? ""),
    words: bodyText ? bodyText.split(" ").length : 0,
    links: [...links],
    jsonLdTypes: [...jsonLdTypes],
    unlabelledInputs: Math.max(0, unlabelledInputs),
    hasMain: /<main\b/i.test(body),
  };
}

export function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => {
    const p = new URL(decode(m[1])).pathname;
    return p.length > 1 ? p.replace(/\/+$/, "") : p;
  });
}

/** Signed-in areas and plumbing the crawl never follows. */
const SKIP = /^\/(api|app|dashboard|ops|auth|login|logout|signup|_next|studio)(\/|$)|\.(png|jpe?g|gif|webp|svg|ico|pdf|mp4|webm|css|js|txt|xml|md)$/i;

export type CrawlOptions = {
  base: string;
  maxPages?: number;
  /** Pause between requests, so the crawl stays gentle on production. */
  delayMs?: number;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
};

export async function crawlSite(opts: CrawlOptions): Promise<{ pages: PageFacts[]; sitemap: string[] }> {
  const base = opts.base.replace(/\/$/, "");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const max = opts.maxPages ?? 400;
  const delay = opts.delayMs ?? 500;
  const headers = { "user-agent": "KOB site check (+https://trykob.com)" };

  let sitemap: string[] = [];
  try {
    const res = await fetchImpl(`${base}/sitemap.xml`, { headers });
    if (res.ok) sitemap = sitemapPaths(await res.text());
  } catch {
    /* no sitemap: crawl from the home page only */
  }

  const depth = new Map<string, number>([["/", 0]]);
  const queue = ["/", ...sitemap.filter((p) => p !== "/")];
  for (const p of sitemap) if (!depth.has(p)) depth.set(p, -1);
  const seen = new Set<string>();
  const pages: PageFacts[] = [];

  while (queue.length && pages.length < max) {
    const path = queue.shift()!;
    if (seen.has(path) || SKIP.test(path)) continue;
    seen.add(path);
    const url = `${base}${path === "/" ? "/" : path}`;
    let res: Response;
    try {
      res = await fetchImpl(url, { headers, redirect: "manual" });
    } catch (e) {
      opts.log?.(`  ! ${path}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const d = depth.get(path) ?? -1;
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400) {
      const to = location ? (internalPath(location, url) ?? location) : null;
      pages.push({ ...emptyFacts(url, path), status: res.status, redirectTo: to, depth: d });
      if (to?.startsWith("/") && !depth.has(to)) {
        depth.set(to, d < 0 ? -1 : d);
        queue.push(to);
      }
    } else {
      const type = res.headers.get("content-type") ?? "";
      const facts = type.includes("html") ? parsePage(await res.text(), url) : emptyFacts(url, path);
      pages.push({ ...facts, path, status: res.status, redirectTo: null, depth: d });
      for (const link of facts.links) {
        if (!depth.has(link) || depth.get(link) === -1) depth.set(link, d < 0 ? -1 : d + 1);
        if (!seen.has(link)) queue.push(link);
      }
    }
    opts.log?.(`  ${res.status} ${path}`);
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }
  return { pages, sitemap };
}

function emptyFacts(url: string, path: string): Omit<PageFacts, "status" | "redirectTo" | "depth"> {
  return { url, path, canonical: null, noindex: false, title: "", description: "", h1: [], firstH2: "", words: 0, links: [], jsonLdTypes: [], unlabelledInputs: 0, hasMain: false };
}

const CSV_COLUMNS: (keyof PageFacts)[] = [
  "path", "status", "redirectTo", "canonical", "noindex", "title", "description", "h1", "firstH2", "words", "depth", "links", "jsonLdTypes", "unlabelledInputs", "hasMain",
];

export function crawlToCsv(pages: PageFacts[]): string {
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? (v as unknown[]).join(" | ") : v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = pages.map((p) => CSV_COLUMNS.map((c) => (c === "links" ? p.links.length : p[c])).map(cell).join(","));
  return [CSV_COLUMNS.map((c) => (c === "links" ? "internal_links_out" : c)).join(","), ...rows].join("\n") + "\n";
}
