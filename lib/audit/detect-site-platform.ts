import fingerprints from "@/lib/audit/platform-fingerprints.json";

export type SitePlatformId =
  | "owner"
  | "toast"
  | "square"
  | "bentobox"
  | "wix"
  | "squarespace"
  | "webflow"
  | "wordpress"
  | "custom"
  | "unknown";

export type SitePlatformConfidence = "high" | "medium" | "low";

export type SitePlatform = {
  platform: SitePlatformId;
  label: string;
  confidence: SitePlatformConfidence;
  /** 0–1 combined fingerprint weight for the winning platform. */
  score: number;
  evidence: string[];
  /** Third-party ordering seen on the page (may differ from the site builder). */
  orderingProviders: string[];
  /** Plain fetch got a bot interstitial; only a rendered session can see the site. */
  botChallenge?: boolean;
};

export type DetectSitePlatformInput = {
  html: string | null;
  finalUrl: string;
  /** Same-origin request paths from a rendered session (Browserbase network facts). */
  networkPaths?: string[];
  cookieNames?: string[];
};

type Fingerprint = { kind: string; pattern: string; weight: number; evidence: string };
type PlatformDef = { label: string; fingerprints: Fingerprint[] };

const PLATFORMS = fingerprints.platforms as Record<Exclude<SitePlatformId, "custom" | "unknown">, PlatformDef>;
const ORDERING = fingerprints.orderingProviders as Record<string, { label: string; pattern: string }>;

const HIGH = 0.85;
const MEDIUM = 0.6;

/** Interstitial markers only — real pages may embed a Turnstile widget. */
const CHALLENGE_RE = /<title>\s*Just a moment\.\.\.\s*<\/title>|cf-browser-verification|_cf_chl_opt/i;

/** Cloudflare (or similar) bot interstitial instead of the restaurant's page. */
export function isBotChallengePage(html: string | null | undefined): boolean {
  return Boolean(html && html.length < 60_000 && CHALLENGE_RE.test(html));
}

function resourceHosts(html: string, finalUrl: string): string[] {
  const hosts = new Set<string>();
  for (const m of html.matchAll(/\b(?:src|href|content|srcset)=["']([^"']+)["']/gi)) {
    try {
      hosts.add(new URL(m[1].split(/\s/)[0], finalUrl).hostname.toLowerCase());
    } catch {
      /* ignore unparsable */
    }
  }
  return [...hosts];
}

function generatorOf(html: string): string | null {
  const m =
    html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i);
  return m?.[1] ?? null;
}

function matches(fp: Fingerprint, ctx: {
  html: string;
  url: string;
  hosts: string[];
  generator: string | null;
  paths: string[];
  cookies: string[];
}): boolean {
  const re = new RegExp(fp.pattern, "i");
  switch (fp.kind) {
    case "html":
      return re.test(ctx.html);
    case "host":
      return ctx.hosts.some((h) => re.test(h));
    case "url":
      return re.test(ctx.url);
    case "generator":
      return ctx.generator != null && re.test(ctx.generator);
    case "path":
      return ctx.paths.some((p) => re.test(p));
    case "cookie":
      return ctx.cookies.some((c) => re.test(c));
    default:
      return false;
  }
}

function confidenceFor(score: number): SitePlatformConfidence {
  if (score >= HIGH) return "high";
  if (score >= MEDIUM) return "medium";
  return "low";
}

export function detectSitePlatform(input: DetectSitePlatformInput): SitePlatform {
  const html = input.html ?? "";
  const paths = input.networkPaths ?? [];
  const cookies = input.cookieNames ?? [];

  if (!html && paths.length === 0 && cookies.length === 0) {
    return {
      platform: "unknown",
      label: "Unknown",
      confidence: "low",
      score: 0,
      evidence: ["No page HTML was captured"],
      orderingProviders: [],
    };
  }
  if (isBotChallengePage(html) && paths.length === 0) {
    return {
      platform: "unknown",
      label: "Unknown",
      confidence: "low",
      score: 0,
      evidence: ["Plain fetch hit a bot challenge (Cloudflare) — needs a rendered browser session"],
      orderingProviders: [],
      botChallenge: true,
    };
  }

  const ctx = {
    html,
    url: input.finalUrl,
    hosts: resourceHosts(html, input.finalUrl),
    generator: generatorOf(html),
    paths,
    cookies,
  };

  let best: { id: keyof typeof PLATFORMS; score: number; evidence: string[] } | null = null;
  for (const [id, def] of Object.entries(PLATFORMS) as [keyof typeof PLATFORMS, PlatformDef][]) {
    const hit = def.fingerprints.filter((fp) => matches(fp, ctx));
    if (hit.length === 0) continue;
    const score = 1 - hit.reduce((acc, fp) => acc * (1 - fp.weight), 1);
    if (!best || score > best.score) best = { id, score, evidence: hit.map((fp) => fp.evidence) };
  }

  const haystack = `${input.finalUrl}\n${html}\n${paths.join("\n")}`;
  const orderingProviders = Object.entries(ORDERING)
    .filter(([, p]) => new RegExp(p.pattern, "i").test(haystack))
    .map(([id]) => id);

  if (!best) {
    return {
      platform: "custom",
      label: "Custom or unrecognised builder",
      confidence: "low",
      score: 0,
      evidence: ctx.generator ? [`Generator meta tag: ${ctx.generator}`] : [],
      orderingProviders,
    };
  }

  const score = Math.round(best.score * 100) / 100;
  return {
    platform: best.id,
    label: PLATFORMS[best.id].label,
    confidence: confidenceFor(score),
    score,
    evidence: best.evidence,
    orderingProviders,
  };
}
