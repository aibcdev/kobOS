import { createHash } from "node:crypto";
import type { AuditEngagementSignals } from "@/lib/audit/engagement-signals";
import { computeEngagementSignals } from "@/lib/audit/engagement-signals";
import { discoverSeoCrawlAssets } from "@/lib/audit/seo-discovery";

export type UrlSignals = {
  fetched: boolean;
  status?: number;
  titleLen: number;
  hasMetaDescription: boolean;
  /** Character length of meta description (0 if missing). */
  metaDescriptionLen: number;
  h1Count: number;
  h2Count: number;
  hasOgTitle: boolean;
  hasCanonical: boolean;
  hasJsonLd: boolean;
  /** Restaurant / FoodEstablishment / LocalBusiness in JSON-LD @type. */
  hasRestaurantSchema: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  hasTelLink: boolean;
  hasMailto: boolean;
  hasBookOrReserveKeyword: boolean;
  hasOpenTableOrResy: boolean;
  imgCount: number;
  /** Images with a non-empty alt attribute. */
  imgWithAltCount: number;
  htmlSizeKb: number;
  /** Extended signals for evidence / benchmark */
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasLangAttr: boolean;
  hasNoindex: boolean;
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  /** True if robots.txt, sitemap, or HTML mentions of either were found. */
  mentionsRobotsOrSitemap: boolean;
};

export type SocialLinkFound = { platform: string; url: string };

/** Public image URL candidates for downstream fetch + vision (no bytes here). */
export type ImageCandidateUrl = {
  ref: string;
  url: string;
  source: string;
};

export type PageEvidenceExtras = {
  titleSnippet: string | null;
  metaDescriptionSnippet: string | null;
  socialLinksFound: SocialLinkFound[];
  /** SHA-256 of first 64kb of HTML (hex) for audit trail */
  contentFingerprint: string | null;
  /** From og/twitter/img/video-poster on the crawled page (absolute URLs). */
  imageCandidates: ImageCandidateUrl[];
};

const RESERVED = /\b(book|reserve|reservation|order online|order now|toast|square|chownow)\b/i;

const SOCIAL_PATTERNS: { platform: string; re: RegExp }[] = [
  { platform: "instagram", re: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?/gi },
  { platform: "facebook", re: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi },
  { platform: "tiktok", re: /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+/gi },
  { platform: "youtube", re: /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/gi },
  { platform: "linkedin", re: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/gi },
];

function extractSocialLinks(html: string): SocialLinkFound[] {
  const seen = new Set<string>();
  const out: SocialLinkFound[] = [];
  for (const { platform, re } of SOCIAL_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const url = m[0].replace(/[,.)]+$/, "");
      const key = `${platform}:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ platform, url });
      if (out.length >= 12) return out;
    }
  }
  return out;
}

function fingerprintHtml(html: string): string {
  const slice = html.slice(0, 65536);
  return createHash("sha256").update(slice, "utf8").digest("hex");
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Long URL fields (og:image) — not truncated like metaContent. */
function metaTagContentByProperty(html: string, property: string): string | null {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+property=["']${esc}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeBasicEntities(m[1].trim()).slice(0, 2048);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${esc}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeBasicEntities(m2[1].trim()).slice(0, 2048) : null;
}

function metaTagContentByName(html: string, name: string): string | null {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]+name=["']${esc}["'][^>]*content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  if (m?.[1]) return decodeBasicEntities(m[1].trim()).slice(0, 2048);
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${esc}["']`, "i");
  const m2 = html.match(re2);
  return m2?.[1] ? decodeBasicEntities(m2[1].trim()).slice(0, 2048) : null;
}

function metaContent(html: string, nameOrProperty: string, attr: "name" | "property"): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return m[1].trim().slice(0, 280);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1]?.trim().slice(0, 280) ?? null;
}

const MAX_IMAGE_CANDIDATES = 8;
const IMG_SRC_RE = /<img[^>]+src=["']([^"']+)["']/gi;
const VIDEO_POSTER_RE = /<video[^>]+poster=["']([^"']+)["']/gi;

export function resolveUrlAgainstPage(pageUrl: string, raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t || t.startsWith("data:") || t.startsWith("javascript:") || t.startsWith("blob:")) return null;
  try {
    const u = new URL(t, pageUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const href = u.href;
    if (/\.svg(\?|#|$)/i.test(href)) return null;
    return href;
  } catch {
    return null;
  }
}

/**
 * Collect og:image, twitter:image, inline <img> src, and video poster URLs.
 * Dedupes by URL; caps at MAX_IMAGE_CANDIDATES.
 */
export function extractImageCandidates(html: string, pageUrl: string): ImageCandidateUrl[] {
  const seen = new Set<string>();
  const out: ImageCandidateUrl[] = [];

  function push(ref: string, url: string | null, source: string) {
    if (!url || seen.has(url) || out.length >= MAX_IMAGE_CANDIDATES) return;
    seen.add(url);
    out.push({ ref, url, source });
  }

  const og = metaTagContentByProperty(html, "og:image");
  push("og_image", resolveUrlAgainstPage(pageUrl, og), "og:image");

  const tw =
    metaTagContentByName(html, "twitter:image") ?? metaTagContentByName(html, "twitter:image:src");
  push("twitter_image", resolveUrlAgainstPage(pageUrl, tw), "twitter:image");

  let imgIdx = 0;
  IMG_SRC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG_SRC_RE.exec(html)) !== null) {
    const resolved = resolveUrlAgainstPage(pageUrl, m[1]);
    if (resolved) {
      imgIdx += 1;
      push(`img_${String(imgIdx).padStart(2, "0")}`, resolved, "img:src");
    }
    if (out.length >= MAX_IMAGE_CANDIDATES) break;
  }

  VIDEO_POSTER_RE.lastIndex = 0;
  let vp = 0;
  while ((m = VIDEO_POSTER_RE.exec(html)) !== null) {
    const resolved = resolveUrlAgainstPage(pageUrl, m[1]);
    if (resolved) {
      vp += 1;
      push(`video_poster_${String(vp).padStart(2, "0")}`, resolved, "video:poster");
    }
    if (out.length >= MAX_IMAGE_CANDIDATES) break;
  }

  return out;
}

export type WebsiteAnalysis = {
  signals: UrlSignals;
  pageEvidence: PageEvidenceExtras;
  engagementSignals?: AuditEngagementSignals;
};

const emptySignals = (): UrlSignals => ({
  fetched: false,
  titleLen: 0,
  hasMetaDescription: false,
  metaDescriptionLen: 0,
  h1Count: 0,
  h2Count: 0,
  hasOgTitle: false,
  hasCanonical: false,
  hasJsonLd: false,
  hasRestaurantSchema: false,
  hasViewport: false,
  isHttps: false,
  hasTelLink: false,
  hasMailto: false,
  hasBookOrReserveKeyword: false,
  hasOpenTableOrResy: false,
  imgCount: 0,
  imgWithAltCount: 0,
  htmlSizeKb: 0,
  hasOgImage: false,
  hasTwitterCard: false,
  hasLangAttr: false,
  hasNoindex: false,
  robotsTxtFound: false,
  sitemapFound: false,
  mentionsRobotsOrSitemap: false,
});

/**
 * Coerce partially-stored / legacy evidence urlSignals into a full UrlSignals shape.
 * Older audits may lack newer SEO fields.
 */
export function normalizeUrlSignals(raw: Partial<UrlSignals> | null | undefined): UrlSignals {
  const base = emptySignals();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    metaDescriptionLen: raw.metaDescriptionLen ?? 0,
    h2Count: raw.h2Count ?? 0,
    imgWithAltCount: raw.imgWithAltCount ?? 0,
    hasRestaurantSchema: raw.hasRestaurantSchema ?? false,
    hasLangAttr: raw.hasLangAttr ?? false,
    hasNoindex: raw.hasNoindex ?? false,
    robotsTxtFound: raw.robotsTxtFound ?? false,
    sitemapFound: raw.sitemapFound ?? false,
    mentionsRobotsOrSitemap: raw.mentionsRobotsOrSitemap ?? false,
  };
}

function countImgWithAlt(html: string): number {
  let n = 0;
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (alt && alt[1].trim().length > 0) n += 1;
  }
  return n;
}

function detectRestaurantSchema(html: string): boolean {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks?.length) return false;
  for (const block of blocks) {
    const inner = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    if (/@"?type"?\s*:\s*"?(Restaurant|FoodEstablishment|LocalBusiness|CafeOrCoffeeShop)/i.test(inner)) {
      return true;
    }
    if (/"@type"\s*:\s*\[\s*[^\]]*(Restaurant|FoodEstablishment|LocalBusiness)/i.test(inner)) {
      return true;
    }
  }
  return false;
}

export type AnalyzeHtmlMeta = {
  /** HTTP status from the transport (fetch, Browserbase navigation, etc.). */
  httpStatus?: number;
};

/**
 * Parse downloaded HTML into the same shape as `analyzeWebsiteFull` (signals + evidence).
 * Used by Browserbase-rendered HTML and by the plain fetch path.
 */
export function analyzeWebsiteFromHtml(
  html: string,
  pageUrl: string,
  meta: AnalyzeHtmlMeta = {},
): WebsiteAnalysis {
  const signals = emptySignals();
  signals.fetched = true;
  signals.status = meta.httpStatus;

  let resolvedPageUrl = pageUrl;
  try {
    const u = new URL(pageUrl);
    signals.isHttps = u.protocol === "https:";
    resolvedPageUrl = u.toString();
  } catch {
    /* keep pageUrl string for relative resolution */
  }

  signals.htmlSizeKb = Math.round(html.length / 1024);
  const contentFingerprint = fingerprintHtml(html);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch?.[1]?.trim() ?? "";
  signals.titleLen = titleText.length;
  const titleSnippet = titleText ? titleText.slice(0, 140) : null;

  signals.hasMetaDescription =
    /<meta[^>]+name=["']description["'][^>]*>/i.test(html) ||
    /<meta[^>]+property=["']og:description["'][^>]*>/i.test(html);
  const metaDescriptionSnippet =
    metaContent(html, "description", "name") ?? metaContent(html, "og:description", "property");
  signals.metaDescriptionLen = metaDescriptionSnippet?.length ?? 0;

  const h1Matches = html.match(/<h1[\s>]/gi);
  signals.h1Count = h1Matches?.length ?? 0;
  signals.h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;

  signals.hasOgTitle = /<meta[^>]+property=["']og:title["'][^>]*>/i.test(html);
  signals.hasOgImage = /<meta[^>]+property=["']og:image["'][^>]*>/i.test(html);
  signals.hasTwitterCard = /<meta[^>]+name=["']twitter:card["'][^>]*>/i.test(html);
  signals.hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
  signals.hasJsonLd = /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html);
  signals.hasRestaurantSchema = detectRestaurantSchema(html);
  signals.hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  signals.hasLangAttr = /<html[^>]+lang=["'][^"']+["']/i.test(html);
  signals.hasNoindex =
    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) ||
    /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);

  signals.hasTelLink = /href=["']tel:/i.test(html);
  signals.hasMailto = /href=["']mailto:/i.test(html);
  signals.hasBookOrReserveKeyword = RESERVED.test(html);
  signals.hasOpenTableOrResy = /opentable|resy|tock|sevenrooms/i.test(html);

  signals.imgCount = (html.match(/<img[\s>]/gi) ?? []).length;
  signals.imgWithAltCount = countImgWithAlt(html);

  const htmlMentionsCrawl =
    /href=["'][^"']*robots\.txt/i.test(html) ||
    /href=["'][^"']*sitemap[^"']*\.xml/i.test(html) ||
    /sitemap\.xml/i.test(html);
  signals.mentionsRobotsOrSitemap = htmlMentionsCrawl;

  const socialLinksFound = extractSocialLinks(html);
  const imageCandidates = extractImageCandidates(html, resolvedPageUrl);

  return {
    signals,
    pageEvidence: {
      titleSnippet,
      metaDescriptionSnippet,
      socialLinksFound,
      contentFingerprint,
      imageCandidates,
    },
    engagementSignals: computeEngagementSignals(html, signals),
  };
}

/** Attach live robots.txt / sitemap probes to an existing HTML analysis. */
export async function enrichWebsiteAnalysisWithSeoDiscovery(
  analysis: WebsiteAnalysis,
  pageUrl: string,
): Promise<WebsiteAnalysis> {
  if (!analysis.signals.fetched || !pageUrl.trim()) return analysis;
  try {
    const crawl = await discoverSeoCrawlAssets(pageUrl);
    const signals: UrlSignals = {
      ...analysis.signals,
      robotsTxtFound: crawl.robotsTxtFound,
      sitemapFound: crawl.sitemapFound,
      mentionsRobotsOrSitemap:
        analysis.signals.mentionsRobotsOrSitemap || crawl.robotsTxtFound || crawl.sitemapFound,
      // noindex via robots Disallow: / is a crawlability hit
      hasNoindex: analysis.signals.hasNoindex || crawl.robotsDisallowsAll,
    };
    return { ...analysis, signals };
  } catch {
    return analysis;
  }
}

const AUDIT_FETCH_TIMEOUT_MS = Number(process.env.AUDIT_FETCH_TIMEOUT_MS) || 18_000;
const AUDIT_USER_AGENT =
  "KOB-VisibilityAudit/1.0 (+https://kob.example; contact@kob.example)";

function normalizeAuditUrl(rawUrl: string): URL | null {
  let urlStr = rawUrl.trim();
  if (!urlStr) return null;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }
  try {
    return new URL(urlStr);
  } catch {
    return null;
  }
}

/** Raw HTML fetch for discovery + analysis (shared with `analyzeWebsiteFull`). */
export async function fetchHtmlForAudit(
  rawUrl: string,
): Promise<{ html: string; finalUrl: string; status: number } | null> {
  const url = normalizeAuditUrl(rawUrl);
  if (!url) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AUDIT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": AUDIT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
      return null;
    }
    const html = await res.text();
    return { html, finalUrl: res.url || url.toString(), status: res.status };
  } catch {
    clearTimeout(t);
    return null;
  }
}

export async function analyzeWebsiteFull(rawUrl: string | undefined): Promise<WebsiteAnalysis> {
  const emptyPage: PageEvidenceExtras = {
    titleSnippet: null,
    metaDescriptionSnippet: null,
    socialLinksFound: [],
    contentFingerprint: null,
    imageCandidates: [],
  };

  const signals = emptySignals();
  if (!rawUrl?.trim()) {
    return { signals, pageEvidence: emptyPage };
  }

  const url = normalizeAuditUrl(rawUrl);
  if (!url) {
    return { signals, pageEvidence: emptyPage };
  }

  signals.isHttps = url.protocol === "https:";

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AUDIT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": AUDIT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    signals.fetched = true;
    signals.status = res.status;
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
      return { signals, pageEvidence: emptyPage };
    }
    const html = await res.text();
    const analysis = analyzeWebsiteFromHtml(html, res.url || url.toString(), {
      httpStatus: res.status,
    });
    return enrichWebsiteAnalysisWithSeoDiscovery(analysis, res.url || url.toString());
  } catch {
    clearTimeout(t);
    return { signals: { ...emptySignals(), ...signals, fetched: true }, pageEvidence: emptyPage };
  }
}

/** @deprecated Prefer analyzeWebsiteFull for new code; kept for callers that only need signals. */
export async function analyzeWebsiteUrl(rawUrl: string | undefined): Promise<UrlSignals> {
  const { signals } = await analyzeWebsiteFull(rawUrl);
  return signals;
}
