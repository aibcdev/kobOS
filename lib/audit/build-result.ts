import type { Prisma } from "@prisma/client";
import {
  analyzeWebsiteFromHtml,
  analyzeWebsiteFull,
  fetchHtmlForAudit,
  type WebsiteAnalysis,
  type UrlSignals,
} from "@/lib/audit/analyze-url";
import { auditCityLabel, guessNameFromTitle, hostLabelFromUrl } from "@/lib/audit/derive-audit-labels";
import { discoverSiblingOrigins } from "@/lib/audit/discover-related-sites";
import { buildEvidencePackV1, type AuditUserSocialInput } from "@/lib/audit/evidence-pack";
import { mergeWebsiteAnalyses } from "@/lib/audit/merge-analyses";
import type { AuditResultPayload } from "@/lib/audit/types";
import { designScoreNudgeFromVisual } from "@/lib/audit/visual-intelligence";
import { applyAuditScoringV2 } from "@/lib/audit/apply-audit-scoring";
import { buildEstimatedCompetitors, fetchNearbyCompetitors } from "@/lib/audit/fetch-nearby-competitors";
import { resolveAuditLocation } from "@/lib/audit/resolve-audit-location";
import type { AuditGeoLocation } from "@/lib/audit/types";
import { runAuditWebsitePipeline } from "@/lib/audit/website-analysis-pipeline";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function scoreFromSignals(
  s: UrlSignals,
  hadUrlInput: boolean,
): Pick<AuditResultPayload["scores"], "seo" | "design" | "mobile" | "conversion"> {
  if (!hadUrlInput) {
    return { seo: 32, design: 35, mobile: 34, conversion: 28 };
  }
  if (!s.fetched) {
    return { seo: 38, design: 42, mobile: 40, conversion: 35 };
  }

  let seo = 35;
  if (s.titleLen > 10 && s.titleLen < 70) seo += 18;
  else if (s.titleLen > 0) seo += 8;
  if (s.hasMetaDescription) seo += 18;
  if (s.h1Count === 1) seo += 12;
  else if (s.h1Count > 1) seo -= 8;
  if (s.hasOgTitle) seo += 8;
  if (s.hasCanonical) seo += 6;
  if (s.hasJsonLd) seo += 12;

  let mobile = 40;
  if (s.hasViewport) mobile += 35;
  if (s.htmlSizeKb < 800) mobile += 15;
  else if (s.htmlSizeKb > 2000) mobile -= 10;

  let design = 40;
  if (s.isHttps) design += 22;
  if (s.imgCount >= 4) design += 18;
  else if (s.imgCount >= 1) design += 8;
  if (s.htmlSizeKb > 15) design += 12;

  let conversion = 32;
  if (s.hasTelLink) conversion += 18;
  if (s.hasMailto) conversion += 8;
  if (s.hasBookOrReserveKeyword) conversion += 22;
  if (s.hasOpenTableOrResy) conversion += 20;

  return {
    seo: clamp(seo, 18, 96),
    mobile: clamp(mobile, 22, 98),
    design: clamp(design, 22, 96),
    conversion: clamp(conversion, 20, 95),
  };
}

function buildIssues(
  s: UrlSignals,
  restaurantName: string,
  hadUrlInput: boolean,
): AuditResultPayload["issues"] {
  const issues: AuditResultPayload["issues"] = [];

  if (!hadUrlInput) {
    issues.push({
      title: "No website URL — visibility is a guess",
      impact: "high",
      fixHint: "Add your site on the next audit run so we can score real pages.",
    });
    issues.push({
      title: "Local pack presence unverified",
      impact: "medium",
      fixHint: "Claim and complete Google Business Profile with weekly photo updates.",
    });
    return issues;
  }

  if (!s.fetched) {
    issues.push({
      title: "We could not reach your website",
      impact: "high",
      fixHint: "Check the URL or your DNS / SSL. Guests bounce when links fail.",
    });
    return issues;
  }

  if (s.status && s.status >= 400) {
    issues.push({
      title: `Your site returned HTTP ${s.status}`,
      impact: "high",
      fixHint: "Fix availability before spending on ads — search engines penalize errors.",
    });
  }

  if (!s.hasMetaDescription) {
    issues.push({
      title: "Missing or weak meta description",
      impact: "high",
      fixHint: "Write a 140–160 character promise: cuisine, neighborhood, and why to book now.",
    });
  }

  if (s.h1Count === 0) {
    issues.push({
      title: "No clear H1 headline",
      impact: "medium",
      fixHint: `Use one H1 like “${restaurantName} — [city neighborhood]” for humans and search.`,
    });
  } else if (s.h1Count > 1) {
    issues.push({
      title: "Multiple H1 tags confuse search engines",
      impact: "medium",
      fixHint: "Keep a single H1; demote other headings to H2/H3.",
    });
  }

  if (!s.hasViewport) {
    issues.push({
      title: "No viewport meta tag",
      impact: "high",
      fixHint: "Mobile guests are the majority; add a responsive viewport declaration.",
    });
  }

  if (!s.hasJsonLd) {
    issues.push({
      title: "No structured data (JSON-LD) detected",
      impact: "medium",
      fixHint: "Add Restaurant / LocalBusiness schema so Google can show rich results.",
    });
  }

  if (!s.hasBookOrReserveKeyword && !s.hasOpenTableOrResy) {
    issues.push({
      title: "Reservation path is not obvious",
      impact: "high",
      fixHint: "Put “Reserve a table” above the fold with a single dominant CTA.",
    });
  }

  if (!s.isHttps) {
    issues.push({
      title: "Site is not served over HTTPS",
      impact: "high",
      fixHint: "HTTPS is required for trust, forms, and modern browser features.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      title: "Baseline checks passed — depth audit recommended",
      impact: "low",
      fixHint: "Unlock the full report for keyword gaps and competitor positioning.",
    });
  }

  return issues.slice(0, 8);
}

function buildOpportunities(
  city: string,
  restaurantName: string,
  s: UrlSignals,
  hadUrl: boolean,
): AuditResultPayload["opportunities"] {
  const opps: AuditResultPayload["opportunities"] = [
    {
      title: `Hyper-local page: “Best nights out near ${city}”`,
      impactEstimate: "High — captures planners 2–4 weeks ahead",
    },
    {
      title: "Menu micro-copy tuned for search + upsell",
      impactEstimate: "Medium — lifts average check on high-intent traffic",
    },
  ];
  if (!hadUrl) {
    opps.unshift({
      title: "Run a full URL audit to unlock page-level fixes",
      impactEstimate: "High — exposes crawl, speed, and CTA gaps",
    });
  }
  if (s.hasJsonLd) {
    opps.push({
      title: "Expand schema to menus + events for rich results",
      impactEstimate: "Medium — more SERP real estate",
    });
  } else {
    opps.push({
      title: `Launch "${restaurantName} ${city}" landing cluster`,
      impactEstimate: "High — closes local-intent searches competitors ignore",
    });
  }
  return opps.slice(0, 6);
}


function buildCompetitors(city: string, seed: string): AuditResultPayload["competitors"] {
  return buildEstimatedCompetitors(city, seed);
}

async function resolveCityAndCompetitors(input: {
  restaurantName: string;
  city: string;
  websiteUrl: string;
  html?: string | null;
  place?: {
    placeId?: string;
    formattedAddress?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
}): Promise<{ city: string; geoLocation: AuditGeoLocation | null; competitors: AuditResultPayload["competitors"] }> {
  const geo = await resolveAuditLocation({
    html: input.html,
    websiteUrl: input.websiteUrl,
    restaurantName: input.restaurantName,
    place: input.place,
    fallbackCity: input.city,
  });

  const resolvedCity =
    geo?.city && geo.city !== "Your area" ? geo.city : input.city !== "Your area" ? input.city : geo?.city ?? input.city;

  const seed = input.restaurantName + input.websiteUrl;
  const competitors =
    geo != null
      ? await fetchNearbyCompetitors({
          lat: geo.lat,
          lng: geo.lng,
          excludeName: input.restaurantName,
          city: resolvedCity,
          seed,
        })
      : buildCompetitors(resolvedCity, seed);

  return { city: resolvedCity, geoLocation: geo, competitors };
}

function buildGated(
  city: string,
  restaurantName: string,
  competitors: AuditResultPayload["competitors"],
): AuditResultPayload["gated"] {
  const base = restaurantName.toLowerCase().replace(/[^a-z0-9\s]/gi, "").trim() || "restaurant";
  const keywordOpportunities = [
    `best ${base} in ${city}`,
    `${base} reservations ${city}`,
    `private dining ${city}`,
    `${city} date night restaurant`,
    `${base} delivery ${city}`,
    `brunch ${city} weekend`,
  ];

  const roadmap = {
    days30: [
      "Fix crawl blockers + meta hygiene on core pages",
      "Publish 3 hyper-local landing pages with proof (reviews, photos)",
      "Add one high-intent CTA module on homepage hero",
    ],
    days60: [
      "Launch weekly content cadence (events, chef story, neighborhood guides)",
      "Expand structured data to menu + FAQ",
      "A/B test reservation vs order CTAs",
    ],
    days90: [
      "Competitor gap report + counter-positioning pages",
      "Automated slow-night recovery campaign templates",
      "Reputation velocity program (reviews + responses)",
    ],
  };

  const competitorDeepDive: AuditResultPayload["gated"]["competitorDeepDive"] = competitors.map((c, idx) => ({
    name: c.name,
    strengths: idx === 0 ? ["GBP posts weekly", "Menu PDF indexed"] : ["Strong backlinks from local press", "Fast mobile LCP"],
    gaps: idx === 0 ? ["Thin menu descriptions", "No events schema"] : ["Weak reservation UX", "Inconsistent NAP on citations"],
  }));

  return {
    keywordOpportunities,
    roadmap,
    competitorDeepDive,
    redesignPreviewNotes: `A premium ${restaurantName} layout: full-bleed hero, warm cream surfaces (#f9f3ed), deep green CTAs (#094413), proof strip with press quotes, and a sticky “Reserve” bar on mobile.`,
  };
}

export function buildAuditPayloadAndRow(
  input: {
    restaurantName: string;
    city: string;
    websiteUrl?: string | null;
    userSocial?: AuditUserSocialInput | null;
    userImageUrls?: string[] | null;
    multiSiteOrigins?: string[] | null;
  },
  analysis: WebsiteAnalysis,
  options?: {
    browserbaseScan?: AuditResultPayload["browserbaseScan"];
    scanStatus?: AuditResultPayload["scanStatus"];
    /** Skip Gemini / media benchmark until async Browserbase completes (handled by route / Inngest). */
    deferInitialAiJobs?: boolean;
    visualMetrics?: AuditResultPayload["visualMetrics"];
    stagehandExtraction?: AuditResultPayload["stagehandExtraction"];
    competitors?: AuditResultPayload["competitors"];
    geoLocation?: AuditResultPayload["geoLocation"];
  },
): { payload: AuditResultPayload; row: Omit<Prisma.VisibilityAuditCreateInput, "id"> } {
  const signals = analysis.signals;
  const evidencePack = buildEvidencePackV1({
    restaurantName: input.restaurantName,
    city: input.city,
    websiteUrl: input.websiteUrl,
    userSocial: input.userSocial,
    userImageUrls: input.userImageUrls,
    signals,
    pageEvidence: analysis.pageEvidence,
    multiSiteOrigins: input.multiSiteOrigins,
  });

  const scoresPart = scoreFromSignals(signals, Boolean(input.websiteUrl?.trim()));
  const designAdj = options?.visualMetrics
    ? clamp(scoresPart.design + designScoreNudgeFromVisual(options.visualMetrics), 18, 96)
    : scoresPart.design;
  const overall = clamp(
    scoresPart.seo * 0.32 + designAdj * 0.22 + scoresPart.mobile * 0.26 + scoresPart.conversion * 0.2,
    22,
    97,
  );

  const hadUrl = Boolean(input.websiteUrl?.trim());
  const issues = buildIssues(signals, input.restaurantName, hadUrl);
  const opportunities = buildOpportunities(input.city, input.restaurantName, signals, hadUrl);
  const competitors =
    options?.competitors ?? buildCompetitors(input.city, input.restaurantName + (input.websiteUrl ?? ""));
  const teaser = {
    headline: `${input.restaurantName} — modern guest-first layout`,
    subline: "Hero imagery, crisp typography, and a single dominant reservation path.",
    paletteNote: "Cream field, deep green actions, warm ink body copy — hospitality premium.",
  };

  const scanStatus = options?.scanStatus ?? "ready";
  const deferAi = Boolean(options?.deferInitialAiJobs);
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  const payload: AuditResultPayload = {
    scoresPending: scanStatus !== "ready",
    scores: {
      overall,
      seo: scoresPart.seo,
      design: designAdj,
      mobile: scoresPart.mobile,
      conversion: scoresPart.conversion,
    },
    issues,
    opportunities,
    competitors,
    ...(options?.geoLocation !== undefined ? { geoLocation: options.geoLocation } : {}),
    teaser,
    gated: buildGated(input.city, input.restaurantName, competitors),
    evidencePack,
    scanStatus,
    ...(options?.browserbaseScan ? { browserbaseScan: options.browserbaseScan } : {}),
    ...(options?.visualMetrics ? { visualMetrics: options.visualMetrics } : {}),
    ...(options?.stagehandExtraction ? { stagehandExtraction: options.stagehandExtraction } : {}),
    ...(geminiKey && !deferAi
      ? {
          benchmarkV1Status: "pending" as const,
          benchmarkV1MediaStatus:
            (evidencePack.imageCandidates?.length ?? 0) > 0 ? ("pending" as const) : ("skipped" as const),
        }
      : {}),
  };

  const row: Omit<Prisma.VisibilityAuditCreateInput, "id"> = {
    restaurantName: input.restaurantName,
    city: input.city,
    websiteUrl: input.websiteUrl?.trim() || null,
    overallScore: overall,
    seoScore: scoresPart.seo,
    designScore: designAdj,
    mobileScore: scoresPart.mobile,
    conversionScore: scoresPart.conversion,
    resultPayload: payload as object,
  };

  return { payload, row };
}

function rowFromPayload(
  input: {
    restaurantName: string;
    city: string;
    websiteUrl?: string | null;
  },
  payload: AuditResultPayload,
): Omit<Prisma.VisibilityAuditCreateInput, "id"> {
  return {
    restaurantName: input.restaurantName,
    city: input.city,
    websiteUrl: input.websiteUrl?.trim() || null,
    overallScore: payload.scores.overall,
    seoScore: payload.scores.seo,
    designScore: payload.scores.design,
    mobileScore: payload.scores.mobile,
    conversionScore: payload.scores.conversion,
    resultPayload: payload as object,
  };
}

async function finalizePayloadScores(
  payload: AuditResultPayload,
  extras?: {
    networkFacts?: import("@/lib/audit/network-capture").AuditNetworkFact[] | null;
    visualMetrics?: AuditResultPayload["visualMetrics"];
    stagehandExtraction?: AuditResultPayload["stagehandExtraction"];
  },
): Promise<AuditResultPayload> {
  if (!payload.evidencePack) return payload;
  return applyAuditScoringV2(payload, extras);
}

export async function buildAuditResult(input: {
  websiteUrl: string;
  siteScope: "one" | "multiple";
  userSocial?: AuditUserSocialInput | null;
  userImageUrls?: string[] | null;
  place?: {
    placeId?: string;
    formattedAddress?: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
}): Promise<{
  payload: AuditResultPayload;
  row: Omit<Prisma.VisibilityAuditCreateInput, "id">;
  queueAsyncBrowserbase: boolean;
}> {
  const raw = input.websiteUrl.trim();
  if (!raw) {
    throw new Error("buildAuditResult: websiteUrl required");
  }

  const city = auditCityLabel(input.siteScope);

  if (input.siteScope === "multiple") {
    let pipelineInput: WebsiteAnalysis;
    let multiSiteOrigins: string[] | undefined;

    const fetched = await fetchHtmlForAudit(raw);
    if (fetched) {
      const primaryAnalysis = analyzeWebsiteFromHtml(fetched.html, fetched.finalUrl, {
        httpStatus: fetched.status,
      });
      const origins = discoverSiblingOrigins(fetched.finalUrl, fetched.html, 5);
      multiSiteOrigins = origins;
      const siblingAnalyses = await Promise.all(origins.slice(1).map((o) => analyzeWebsiteFull(o)));
      pipelineInput = mergeWebsiteAnalyses([primaryAnalysis, ...siblingAnalyses]);
    } else {
      pipelineInput = await analyzeWebsiteFull(raw);
      multiSiteOrigins = undefined;
    }

    const restaurantName =
      guessNameFromTitle(pipelineInput.pageEvidence.titleSnippet) ?? hostLabelFromUrl(raw);

    const { city: resolvedCity, geoLocation, competitors } = await resolveCityAndCompetitors({
      restaurantName,
      city,
      websiteUrl: raw,
      html: fetched?.html ?? null,
      place: input.place,
    });

    const pipeline = await runAuditWebsitePipeline(raw, { restaurantName, city: resolvedCity }, {
      precomputedAnalysis: pipelineInput,
      skipBrowserbase: true,
    });
    const deferJobs = pipeline.queueAsyncBrowserbase;
    let { payload } = buildAuditPayloadAndRow(
      {
        restaurantName,
        city: resolvedCity,
        websiteUrl: raw,
        userSocial: input.userSocial,
        userImageUrls: input.userImageUrls,
        multiSiteOrigins: multiSiteOrigins?.length ? multiSiteOrigins : null,
      },
      pipeline.analysis,
      {
        browserbaseScan: pipeline.browserbaseScan,
        scanStatus: deferJobs ? "pending" : "ready",
        deferInitialAiJobs: deferJobs,
        visualMetrics: pipeline.visualMetrics,
        stagehandExtraction: pipeline.stagehandExtraction,
        geoLocation,
        competitors,
      },
    );
    payload = await finalizePayloadScores(payload, {
      networkFacts: pipeline.networkFacts,
      visualMetrics: pipeline.visualMetrics,
      stagehandExtraction: pipeline.stagehandExtraction,
    });
    const row = rowFromPayload({ restaurantName, city: resolvedCity, websiteUrl: raw }, payload);

    return { payload, row, queueAsyncBrowserbase: pipeline.queueAsyncBrowserbase };
  }

  const [first, fetchedHtml] = await Promise.all([analyzeWebsiteFull(raw), fetchHtmlForAudit(raw)]);
  const restaurantName =
    guessNameFromTitle(first.pageEvidence.titleSnippet) ?? hostLabelFromUrl(raw);

  const { city: resolvedCity, geoLocation, competitors } = await resolveCityAndCompetitors({
    restaurantName,
    city,
    websiteUrl: raw,
    html: fetchedHtml?.html ?? null,
    place: input.place,
  });

  const pipeline = await runAuditWebsitePipeline(raw, { restaurantName, city: resolvedCity }, {
    precomputedAnalysis: first,
  });
  const deferJobs = pipeline.queueAsyncBrowserbase;
  let { payload } = buildAuditPayloadAndRow(
    {
      restaurantName,
      city: resolvedCity,
      websiteUrl: raw,
      userSocial: input.userSocial,
      userImageUrls: input.userImageUrls,
      multiSiteOrigins: null,
    },
    pipeline.analysis,
    {
      browserbaseScan: pipeline.browserbaseScan,
      scanStatus: deferJobs ? "pending" : "ready",
      deferInitialAiJobs: deferJobs,
      visualMetrics: pipeline.visualMetrics,
      stagehandExtraction: pipeline.stagehandExtraction,
      geoLocation,
      competitors,
    },
  );
  payload = await finalizePayloadScores(payload, {
    networkFacts: pipeline.networkFacts,
    visualMetrics: pipeline.visualMetrics,
    stagehandExtraction: pipeline.stagehandExtraction,
  });
  const row = rowFromPayload({ restaurantName, city: resolvedCity, websiteUrl: raw }, payload);

  return { payload, row, queueAsyncBrowserbase: pipeline.queueAsyncBrowserbase };
}
