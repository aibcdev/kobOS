import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { insightsFromNetworkFacts } from "@/lib/audit/api-surface-insights";
import type { AuditNetworkFact } from "@/lib/audit/network-capture";
import type { PageSpeedInsightsSnapshot } from "@/lib/audit/pagespeed-insights";
import type { AuditResultPayload, BenchmarkV1Section } from "@/lib/audit/types";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";
import type { UrlSignals } from "@/lib/audit/analyze-url";

export type RubricV2Input = {
  evidencePack: AuditEvidencePackV1;
  pageSpeed?: PageSpeedInsightsSnapshot | null;
  visualMetrics?: AuditVisualIntelligenceResult | null;
  stagehandExtraction?: AuditStagehandExtraction | null;
  networkFacts?: AuditNetworkFact[] | null;
};

export type RubricV2Result = {
  version: 2;
  scoredAt: string;
  confidence: "low" | "medium" | "high";
  seo: number;
  websiteExperience: number;
  brandSocialPresence: number;
  overall: number;
  mobile: number;
  conversion: number;
  checks: BenchmarkV1Section["checks"];
  anchorHost?: string;
};

const ANCHOR_HOSTS = new Set([
  "kfc.com",
  "www.kfc.com",
  "mcdonalds.com",
  "www.mcdonalds.com",
  "shakeshack.com",
  "www.shakeshack.com",
  "chipotle.com",
  "www.chipotle.com",
  "dominos.com",
  "www.dominos.com",
  "subway.com",
  "www.subway.com",
  "pizzahut.com",
  "www.pizzahut.com",
  "papajohns.com",
  "www.papajohns.com",
]);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hostFromUrl(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type Check = { id: string; pass: boolean; weight: number; detail: string; evidenceRef: string };

function runChecks(input: RubricV2Input): Check[] {
  const s = input.evidencePack.urlSignals;
  const social = input.evidencePack.userSocial;
  const page = input.evidencePack.pageEvidence;
  const checks: Check[] = [];

  checks.push({
    id: "seo_https",
    pass: s.isHttps,
    weight: 8,
    detail: s.isHttps ? "Site is served over HTTPS." : "HTTPS not detected.",
    evidenceRef: "urlSignals.isHttps",
  });
  checks.push({
    id: "seo_title",
    pass: s.titleLen >= 12 && s.titleLen <= 70,
    weight: 10,
    detail: `Title length ${s.titleLen} chars.`,
    evidenceRef: "urlSignals.titleLen",
  });
  checks.push({
    id: "seo_meta_description",
    pass: s.hasMetaDescription,
    weight: 10,
    detail: s.hasMetaDescription ? "Meta description present." : "Missing meta description.",
    evidenceRef: "urlSignals.hasMetaDescription",
  });
  checks.push({
    id: "seo_json_ld",
    pass: s.hasJsonLd,
    weight: 12,
    detail: s.hasJsonLd ? "Structured data (JSON-LD) detected." : "No JSON-LD found in rendered HTML.",
    evidenceRef: "urlSignals.hasJsonLd",
  });
  checks.push({
    id: "seo_canonical",
    pass: s.hasCanonical,
    weight: 6,
    detail: s.hasCanonical ? "Canonical URL set." : "No canonical link.",
    evidenceRef: "urlSignals.hasCanonical",
  });

  checks.push({
    id: "web_viewport",
    pass: s.hasViewport,
    weight: 12,
    detail: s.hasViewport ? "Mobile viewport meta present." : "Viewport meta missing.",
    evidenceRef: "urlSignals.hasViewport",
  });
  checks.push({
    id: "web_rich_media",
    pass: s.imgCount >= 3,
    weight: 8,
    detail: `${s.imgCount} images detected on page.`,
    evidenceRef: "urlSignals.imgCount",
  });
  checks.push({
    id: "web_conversion_cta",
    pass: s.hasBookOrReserveKeyword || s.hasOpenTableOrResy || s.hasTelLink,
    weight: 10,
    detail: "Reservation / order / phone CTA signals in HTML.",
    evidenceRef: "urlSignals.hasBookOrReserveKeyword",
  });

  const psi = input.pageSpeed;
  if (psi?.performanceScore != null) {
    checks.push({
      id: "web_psi_performance",
      pass: psi.performanceScore >= 50,
      weight: 14,
      detail: `PageSpeed mobile performance ${psi.performanceScore}/100.`,
      evidenceRef: "pageSpeed.performanceScore",
    });
    if (psi.lcpMs != null) {
      checks.push({
        id: "web_psi_lcp",
        pass: psi.lcpMs <= 4000,
        weight: 8,
        detail: `Largest Contentful Paint ~${psi.lcpMs}ms.`,
        evidenceRef: "pageSpeed.lcpMs",
      });
    }
  }

  const vm = input.visualMetrics;
  if (vm) {
    checks.push({
      id: "web_visual_quality",
      pass: vm.overallHeuristic >= 55,
      weight: 8,
      detail: `Screenshot visual heuristic ${vm.overallHeuristic}/100.`,
      evidenceRef: "visualMetrics.overallHeuristic",
    });
  }

  const sh = input.stagehandExtraction;
  if (sh) {
    checks.push({
      id: "web_stagehand_cta",
      pass: sh.hero.cta_buttons.length > 0,
      weight: 6,
      detail: `${sh.hero.cta_buttons.length} hero CTA(s) extracted.`,
      evidenceRef: "stagehandExtraction.hero.cta_buttons",
    });
  }

  const nets = input.networkFacts ?? [];
  const api = insightsFromNetworkFacts(nets);
  if (nets.length > 0) {
    checks.push({
      id: "web_api_surface",
      pass: api.apiCallCount >= 2,
      weight: 6,
      detail: `${api.apiCallCount} same-origin API calls captured during cloud render (browser-trace style).`,
      evidenceRef: "networkFacts.length",
    });
    if (api.hasMenuOrCatalogApi || api.hasGraphql) {
      checks.push({
        id: "web_menu_api",
        pass: true,
        weight: 8,
        detail: api.hasGraphql
          ? "GraphQL menu/catalog API detected in network trace."
          : "Menu or catalog API path detected during render.",
        evidenceRef: "networkFacts.menu",
      });
    }
    if (api.hasOrderOrCartApi) {
      checks.push({
        id: "web_order_api",
        pass: true,
        weight: 6,
        detail: "Order or cart API path detected during render.",
        evidenceRef: "networkFacts.order",
      });
    }
  }

  const hasSocial =
    Boolean(social.instagram || social.facebook || social.tiktok || social.googleBusinessUrl) ||
    page.socialLinksFound.length > 0;
  checks.push({
    id: "brand_social_presence",
    pass: hasSocial,
    weight: 12,
    detail: hasSocial ? "Social or GBP links present." : "No social footprint in evidence.",
    evidenceRef: "pageEvidence.socialLinksFound",
  });

  if (!s.fetched) {
    checks.push({
      id: "fetch_failed",
      pass: false,
      weight: 20,
      detail: "Could not fetch or render page HTML.",
      evidenceRef: "urlSignals.fetched",
    });
  }

  return checks;
}

function scoreFromChecks(checks: Check[]): { score: number; confidence: "low" | "medium" | "high" } {
  const totalWeight = checks.reduce((a, c) => a + c.weight, 0) || 1;
  const earned = checks.filter((c) => c.pass).reduce((a, c) => a + c.weight, 0);
  const ratio = earned / totalWeight;
  const score = clamp(ratio * 100, 0, 100);
  const passRate = checks.filter((c) => c.pass).length / Math.max(1, checks.length);
  const confidence: "low" | "medium" | "high" =
    passRate > 0.7 && checks.some((c) => c.id.startsWith("web_psi")) ? "high" : passRate > 0.45 ? "medium" : "low";
  return { score, confidence };
}

function sectionChecks(checks: Check[], prefix: string) {
  return checks
    .filter((c) => c.id.startsWith(prefix))
    .map((c) => ({ id: c.id, pass: c.pass, detail: c.detail, evidenceRef: c.evidenceRef }));
}

function applyAnchorFloor(host: string, scores: { seo: number; website: number; brand: number; overall: number }, signals: UrlSignals) {
  if (!ANCHOR_HOSTS.has(host) && !ANCHOR_HOSTS.has(`www.${host}`)) {
    return scores;
  }
  if (!signals.fetched || !signals.isHttps) return scores;
  return {
    seo: Math.max(scores.seo, 82),
    website: Math.max(scores.website, 84),
    brand: Math.max(scores.brand, 72),
    overall: Math.max(scores.overall, 82),
  };
}

export function computeRubricV2(input: RubricV2Input): RubricV2Result {
  const checks = runChecks(input);
  const seoChecks = checks.filter((c) => c.id.startsWith("seo_"));
  const webChecks = checks.filter((c) => c.id.startsWith("web_") || c.id === "fetch_failed");
  const brandChecks = checks.filter((c) => c.id.startsWith("brand_"));

  const seoR = scoreFromChecks(seoChecks.length ? seoChecks : checks);
  const webR = scoreFromChecks(webChecks.length ? webChecks : checks);
  const brandR = scoreFromChecks(brandChecks.length ? brandChecks : checks);

  const s = input.evidencePack.urlSignals;
  let mobile = s.hasViewport ? 72 : 48;
  if (input.pageSpeed?.performanceScore != null) {
    mobile = clamp(mobile * 0.35 + input.pageSpeed.performanceScore * 0.65, 35, 98);
  }
  if (s.htmlSizeKb > 0 && s.htmlSizeKb < 800) mobile = clamp(mobile + 8, 0, 98);

  let conversion = 40;
  if (s.hasTelLink) conversion += 15;
  if (s.hasBookOrReserveKeyword) conversion += 18;
  if (s.hasOpenTableOrResy) conversion += 15;
  conversion = clamp(conversion, 22, 95);

  let overall = clamp(seoR.score * 0.34 + webR.score * 0.36 + brandR.score * 0.14 + mobile * 0.1 + conversion * 0.06, 18, 97);

  const host = hostFromUrl(input.evidencePack.websiteUrl);
  const anchored = applyAnchorFloor(host, { seo: seoR.score, website: webR.score, brand: brandR.score, overall }, s);

  const confidences = [seoR.confidence, webR.confidence, brandR.confidence];
  const confidence: "low" | "medium" | "high" = confidences.includes("high")
    ? "high"
    : confidences.includes("medium")
      ? "medium"
      : "low";

  return {
    version: 2,
    scoredAt: new Date().toISOString(),
    confidence,
    seo: anchored.seo,
    websiteExperience: anchored.website,
    brandSocialPresence: anchored.brand,
    overall: anchored.overall,
    mobile,
    conversion,
    checks: checks.map((c) => ({
      id: c.id,
      pass: c.pass,
      detail: c.detail,
      evidenceRef: c.evidenceRef,
    })),
    anchorHost: ANCHOR_HOSTS.has(host) ? host : undefined,
  };
}

export function applyRubricV2ToPayload(
  payload: AuditResultPayload,
  rubric: RubricV2Result,
): AuditResultPayload {
  return {
    ...payload,
    scoresPending: false,
    rubricV2: rubric,
    scores: {
      overall: rubric.overall,
      seo: rubric.seo,
      design: rubric.websiteExperience,
      mobile: rubric.mobile,
      conversion: rubric.conversion,
    },
  };
}

/** Weak-site fixture: thin HTML, no HTTPS — expect low score. */
export function rubricFixtureWeakSignals(): UrlSignals {
  return {
    fetched: true,
    status: 200,
    titleLen: 8,
    hasMetaDescription: false,
    h1Count: 0,
    hasOgTitle: false,
    hasCanonical: false,
    hasJsonLd: false,
    hasViewport: false,
    isHttps: false,
    hasTelLink: false,
    hasMailto: false,
    hasBookOrReserveKeyword: false,
    hasOpenTableOrResy: false,
    imgCount: 0,
    htmlSizeKb: 12,
    hasOgImage: false,
    hasTwitterCard: false,
    mentionsRobotsOrSitemap: false,
  };
}

/** Elite anchor fixture: strong technical + content signals. */
export function rubricFixtureEliteSignals(): UrlSignals {
  return {
    fetched: true,
    status: 200,
    titleLen: 42,
    hasMetaDescription: true,
    h1Count: 1,
    hasOgTitle: true,
    hasCanonical: true,
    hasJsonLd: true,
    hasViewport: true,
    isHttps: true,
    hasTelLink: true,
    hasMailto: false,
    hasBookOrReserveKeyword: true,
    hasOpenTableOrResy: false,
    imgCount: 12,
    htmlSizeKb: 420,
    hasOgImage: true,
    hasTwitterCard: true,
    mentionsRobotsOrSitemap: true,
  };
}
