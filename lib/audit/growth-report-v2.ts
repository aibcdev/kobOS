/**
 * Audit V2 — Restaurant Growth Report view-model.
 * Maps existing AuditResultPayload → owner-facing growth brief.
 * Honesty rules: ranges only; never invent Instagram/reply/peer photo counts.
 */

import type { AuditCompetitor, AuditIssue, AuditResultPayload } from "@/lib/audit/types";
import {
  computeGrowthScore,
  projectedGrowthAfterWins,
} from "@/lib/audit/audit-opportunity-from-payload";

export type GrowthPotentialBand = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type ImpactLevel = "High" | "Medium" | "Low" | "Unknown";
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

export type GrowthReportMeta = {
  restaurantName: string;
  city: string;
  websiteUrl: string | null;
  analysedAt: Date | string;
  overallScore?: number;
};

export type GrowthReportV2 = {
  version: "growth-report-v2";
  hero: {
    title: "Restaurant Growth Report";
    subtitle: string;
    restaurantName: string;
    cuisine: string;
    location: string;
    analysedAtLabel: string;
  };
  growthPotential: {
    band: GrowthPotentialBand;
    score: number;
    explanation: string;
  };
  monthlyOpportunity: {
    customersLow: number;
    customersHigh: number;
  };
  channelImpact: Array<{
    channel: string;
    impact: ImpactLevel;
  }>;
  benchmarks: Array<{
    label: string;
    you: string;
    similar: string;
  }>;
  competitors: Array<{
    name: string;
    rating: number | null;
    reviewCount: number | null;
    photoCount: number | null;
    note: string;
  }>;
  topImprovements: Array<{
    title: string;
    whyItMatters: string;
    impact: ImpactLevel;
    difficulty: DifficultyLevel;
    estimatedCustomersPerMonth: number | null;
  }>;
  websiteHealth: Array<{ statement: string; impact: ImpactLevel }>;
  googlePresence: {
    rating: number | null;
    reviewCount: number | null;
    photoCount: number | null;
    strengths: string[];
    weaknesses: string[];
  };
  socialPresence: {
    channels: Array<{ name: string; status: string }>;
    summary: string;
  };
  customerTrust: {
    score: number | null;
    label: string;
    factors: string[];
  };
  quickWins: Array<{
    title: string;
    effortMinutes: number;
    impact: ImpactLevel;
  }>;
  weeklyTracking: {
    today: number;
    potential: number;
  };
  finalCta: {
    headline: string;
    body: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref: string;
    secondaryLabel: string;
  };
};

const CUISINE_LABELS: Record<string, string> = {
  burger: "Burgers & grill",
  pizza: "Pizza",
  coffee: "Café",
  asian: "Asian cuisine",
  general: "Restaurant",
};

/** Exported for tests + UI. */
export function inferCuisineKey(name: string, websiteUrl: string | null): string {
  const text = `${name} ${websiteUrl ?? ""}`.toLowerCase();
  if (/\b(burger|grill|smoke|pit|bbq)\b/.test(text)) return "burger";
  if (/\b(pizza|pizzeria|slice)\b/.test(text)) return "pizza";
  if (/\b(coffee|café|cafe|espresso|roast)\b/.test(text)) return "coffee";
  if (/\b(indian|curry|tandoori|balti|biryani)\b/.test(text)) return "asian";
  if (/\b(thai|sushi|ramen|asian|wok|dim sum|chinese|japanese|korean|vietnamese|lebanese|turkish)\b/.test(text))
    return "asian";
  return "general";
}

export function cuisineDisplayLabel(name: string, websiteUrl: string | null): string {
  return CUISINE_LABELS[inferCuisineKey(name, websiteUrl)] ?? "Restaurant";
}

export function growthPotentialFromScore(score: number): GrowthPotentialBand {
  const s = Math.max(0, Math.min(100, score));
  // Lower health score ⇒ higher growth potential
  if (s < 45) return "VERY_HIGH";
  if (s < 60) return "HIGH";
  if (s < 75) return "MEDIUM";
  return "LOW";
}

export function growthPotentialExplanation(band: GrowthPotentialBand, score: number): string {
  switch (band) {
    case "VERY_HIGH":
      return "Several parts of your online presence are holding back customer growth compared with similar restaurants nearby.";
    case "HIGH":
      return "Your restaurant has solid foundations, but clear gaps are sending potential customers elsewhere.";
    case "MEDIUM":
      return "Your restaurant already has strong foundations, but several parts of your online presence perform below similar restaurants nearby.";
    case "LOW":
      return `Your digital presence is relatively healthy (growth score ${score}). Fine-tuning a few areas can still unlock more customers.`;
  }
}

/** Point estimate → inclusive range. Never returns a single precise number. */
export function customerRangeFromPoint(point: number): { low: number; high: number } {
  const p = Math.max(5, Math.round(point));
  const spread = Math.max(8, Math.round(p * 0.28));
  const low = Math.max(5, p - spread);
  const high = p + spread;
  return { low, high };
}

export function revenueRangeFromCustomers(
  customersLow: number,
  customersHigh: number,
  aovGbp: number,
): { low: number; high: number } {
  const aov = Math.max(8, Math.round(aovGbp));
  // Round to nearest £50 / £100 for ranges (no fake precision)
  const roundBand = (n: number) => {
    if (n >= 2000) return Math.round(n / 100) * 100;
    if (n >= 500) return Math.round(n / 50) * 50;
    return Math.round(n / 25) * 25;
  };
  return {
    low: roundBand(customersLow * aov),
    high: roundBand(customersHigh * aov),
  };
}

function impactFromCustomers(n: number | null | undefined): ImpactLevel {
  if (n == null || !Number.isFinite(n)) return "Unknown";
  if (n >= 25) return "High";
  if (n >= 12) return "Medium";
  return "Low";
}

function impactFromAxisScore(score: number | null | undefined): ImpactLevel {
  if (score == null || !Number.isFinite(score)) return "Unknown";
  if (score < 55) return "High";
  if (score < 72) return "Medium";
  return "Low";
}

function difficultyForTitle(title: string): DifficultyLevel {
  const t = title.toLowerCase();
  if (/review|photo|post|hours|description|reply|upload|pin/.test(t)) return "Easy";
  if (/website|homepage|menu|seo|brand/.test(t)) return "Medium";
  return "Medium";
}

function formatDateLabel(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function competitorRating(c: AuditCompetitor): number | null {
  if (typeof c.rating === "number" && c.rating >= 1 && c.rating <= 5) return c.rating;
  // mockScore historically stores rating*18 or raw rating — only trust if source is places and we have rating field
  if (c.source === "places" && c.mockScore > 0 && c.mockScore <= 5) return c.mockScore;
  if (c.source === "places" && c.mockScore > 5 && c.mockScore <= 100) {
    const inferred = c.mockScore / 18;
    if (inferred >= 3 && inferred <= 5) return Math.round(inferred * 10) / 10;
  }
  return null;
}

function plainWebsiteStatements(issues: AuditIssue[]): Array<{ statement: string; impact: ImpactLevel }> {
  const out: Array<{ statement: string; impact: ImpactLevel }> = [];
  const seen = new Set<string>();

  const mapIssue = (title: string): string | null => {
    const t = title.toLowerCase();
    if (/lcp|cls|inp|fid|ttfb|largest contentful|cumulative layout|core web/.test(t)) {
      return "Website loads slower than similar restaurants.";
    }
    if (/schema|json-ld|canonical|meta description|og:|open graph|robots|sitemap|hreflang/.test(t)) {
      return null; // skip pure tech jargon
    }
    if (/menu/.test(t)) return "Menu is difficult to discover.";
    if (/book|reserv|order|cta|conversion|call to action/.test(t)) {
      return "Your homepage doesn't clearly encourage bookings.";
    }
    if (/contact|phone|address|map/.test(t)) return "Contact details could be easier to find.";
    if (/mobile|viewport/.test(t)) return "The site is harder to use on a phone than it should be.";
    if (/image|photo|alt/.test(t)) return "Photos on the site could work harder to win trust.";
    if (/https|ssl|security/.test(t)) return "Site security signals could be stronger.";
    if (/speed|slow|performance/.test(t)) return "Website loads slower than similar restaurants.";
    return title.replace(/\b(SEO|LCP|CLS|CWV)\b/gi, "").trim() || null;
  };

  for (const issue of issues) {
    const statement = mapIssue(issue.title);
    if (!statement) continue;
    const key = statement.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      statement,
      impact: issue.impact === "high" ? "High" : issue.impact === "low" ? "Low" : "Medium",
    });
    if (out.length >= 5) break;
  }

  if (out.length === 0) {
    out.push({
      statement: "A few homepage clarity improvements could help more guests book or visit.",
      impact: "Medium",
    });
  }
  return out;
}

function buildTopImprovements(payload: AuditResultPayload): GrowthReportV2["topImprovements"] {
  const report = payload.opportunityReport;
  const fixes = report?.topFixes ?? [];
  const items: GrowthReportV2["topImprovements"] = [];

  for (const f of fixes) {
    items.push({
      title: f.title,
      whyItMatters: f.detail,
      impact: impactFromCustomers(f.customersPerMonth),
      difficulty: difficultyForTitle(f.title),
      estimatedCustomersPerMonth: f.customersPerMonth > 0 ? f.customersPerMonth : null,
    });
  }

  for (const issue of payload.issues) {
    if (items.length >= 5) break;
    const title = issue.title;
    if (items.some((i) => i.title.toLowerCase() === title.toLowerCase())) continue;
    if (/lcp|cls|schema|canonical|json-ld/i.test(title)) continue;
    items.push({
      title,
      whyItMatters: issue.fixHint || "Improving this helps more guests choose you.",
      impact: issue.impact === "high" ? "High" : issue.impact === "low" ? "Low" : "Medium",
      difficulty: difficultyForTitle(title),
      estimatedCustomersPerMonth: null,
    });
  }

  for (const o of payload.opportunities) {
    if (items.length >= 5) break;
    if (items.some((i) => i.title.toLowerCase() === o.title.toLowerCase())) continue;
    items.push({
      title: o.title,
      whyItMatters: o.impactEstimate || "Could win more customers from nearby competitors.",
      impact: "Medium",
      difficulty: difficultyForTitle(o.title),
      estimatedCustomersPerMonth: null,
    });
  }

  return items.slice(0, 5);
}

function buildBenchmarks(payload: AuditResultPayload): GrowthReportV2["benchmarks"] {
  const rows: GrowthReportV2["benchmarks"] = [];
  const gp = payload.evidencePack?.googlePlace;
  const placesComps = payload.competitors.filter((c) => c.source === "places");

  if (gp?.rating != null) {
    const ratings = placesComps
      .map((c) => competitorRating(c))
      .filter((n): n is number => n != null);
    rows.push({
      label: "Google rating",
      you: gp.rating.toFixed(1),
      similar: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—",
    });
  }

  if (gp?.reviewCount != null) {
    const counts = placesComps
      .map((c) => c.reviewCount)
      .filter((n): n is number => typeof n === "number" && n > 0);
    rows.push({
      label: "Google reviews",
      you: gp.reviewCount.toLocaleString("en-GB"),
      similar: counts.length
        ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length).toLocaleString("en-GB")
        : "—",
    });
  }

  if (gp?.photoCount != null && gp.photoCount >= 0) {
    const photos = placesComps
      .map((c) => c.photoCount)
      .filter((n): n is number => typeof n === "number" && n >= 0);
    // Only show peer side when we have real peer photo counts — never fabricate
    rows.push({
      label: "Google photos",
      you: String(gp.photoCount),
      similar: photos.length
        ? String(Math.round(photos.reduce((a, b) => a + b, 0) / photos.length))
        : "—",
    });
  }

  const websiteScore = payload.restaurantScores?.website ?? payload.scores?.conversion;
  if (websiteScore != null) {
    rows.push({
      label: "Website clarity",
      you: String(Math.round(websiteScore)),
      similar: "—",
    });
  }

  // Prefer real nearbyComparison rows that aren't fabricated photo rows
  for (const row of payload.opportunityReport?.nearbyComparison ?? []) {
    if (/photo/i.test(row.label) && row.nearby !== "—") {
      // Skip legacy fabricated photo rows if we already added an honest photos row
      if (rows.some((r) => /photo/i.test(r.label))) continue;
    }
    if (rows.some((r) => r.label.toLowerCase() === row.label.toLowerCase())) continue;
    if (row.nearby && row.nearby !== "—" && /photo/i.test(row.label)) {
      // Don't import fabricated nearby photo numbers from old payloads
      // Heuristic: if nearby is exactly max(you+15, you*1.6) style, skip — hard to detect.
      // Safer: only add non-photo rows from legacy nearbyComparison
      continue;
    }
    rows.push({ label: row.label, you: row.you, similar: row.nearby });
  }

  return rows;
}

function buildCompetitors(payload: AuditResultPayload): GrowthReportV2["competitors"] {
  return payload.competitors
    .filter((c) => c.source === "places" || (c.source !== "estimated" && c.mockScore > 0))
    .filter((c) => c.source !== "estimated")
    .slice(0, 4)
    .map((c) => ({
      name: c.name,
      rating: competitorRating(c),
      reviewCount: typeof c.reviewCount === "number" ? c.reviewCount : null,
      photoCount: typeof c.photoCount === "number" ? c.photoCount : null,
      note: c.note,
    }));
}

function buildQuickWins(top: GrowthReportV2["topImprovements"]): GrowthReportV2["quickWins"] {
  const defaults: GrowthReportV2["quickWins"] = [
    { title: "Reply to recent Google reviews", effortMinutes: 15, impact: "High" },
    { title: "Upload five new Google photos", effortMinutes: 10, impact: "Medium" },
    { title: "Update your Google business description", effortMinutes: 10, impact: "Medium" },
    { title: "Pin a booking or order link on Instagram", effortMinutes: 5, impact: "Medium" },
    { title: "Confirm opening hours are correct", effortMinutes: 5, impact: "Low" },
  ];

  const fromTop: GrowthReportV2["quickWins"] = top
    .filter((t) => t.difficulty === "Easy")
    .slice(0, 3)
    .map((t) => ({
      title: t.title,
      effortMinutes: 15,
      impact: (t.impact === "Unknown" ? "Medium" : t.impact) as "High" | "Medium" | "Low",
    }));

  const merged: GrowthReportV2["quickWins"] = [...fromTop];
  for (const d of defaults) {
    if (merged.length >= 5) break;
    if (merged.some((m) => m.title.toLowerCase() === d.title.toLowerCase())) continue;
    merged.push(d);
  }
  return merged.slice(0, 5);
}

export function buildGrowthReportV2(
  payload: AuditResultPayload,
  meta: GrowthReportMeta,
): GrowthReportV2 {
  const metrics = payload.opportunityReport?.opportunity_score;
  const growthScore =
    payload.opportunityReport?.growthScore ??
    computeGrowthScore(payload, metrics ?? null) ??
    meta.overallScore ??
    55;

  const band = growthPotentialFromScore(growthScore);
  const lostPoint = metrics?.est_monthly_lost_customers ?? 30;
  const { low: customersLow, high: customersHigh } = customerRangeFromPoint(lostPoint);

  const rs = payload.restaurantScores;
  const channelImpact: GrowthReportV2["channelImpact"] = [
    { channel: "Google Reviews", impact: impactFromAxisScore(rs?.reviews) },
    { channel: "Website", impact: impactFromAxisScore(rs?.website ?? payload.scores?.conversion) },
    {
      channel: "Instagram",
      impact: "Unknown", // never proxy — Phase 2 wires real stats
    },
    { channel: "Google Business", impact: impactFromAxisScore(rs?.gbp) },
    { channel: "Local SEO", impact: impactFromAxisScore(rs?.competitors ?? payload.scores?.seo) },
  ];

  const topImprovements = buildTopImprovements(payload);
  const projected =
    payload.opportunityReport?.projectedGrowthScore ??
    projectedGrowthAfterWins(
      growthScore,
      (payload.opportunityReport?.topFixes ?? []).map((f) => ({
        title: f.title,
        detail: f.detail,
        customersPerMonth: f.customersPerMonth,
      })),
    );

  const gp = payload.evidencePack?.googlePlace;
  const socialLinks = payload.evidencePack?.pageEvidence?.socialLinksFound ?? [];
  const userSocial = payload.evidencePack?.userSocial;
  const hasIg =
    Boolean(userSocial?.instagram) ||
    socialLinks.some((s) => /instagram/i.test(s.platform ?? "") || /instagram/i.test(s.url ?? ""));
  const hasFb =
    Boolean(userSocial?.facebook) ||
    socialLinks.some((s) => /facebook/i.test(s.platform ?? "") || /facebook/i.test(s.url ?? ""));
  const hasTt =
    Boolean(userSocial?.tiktok) ||
    socialLinks.some((s) => /tiktok/i.test(s.platform ?? "") || /tiktok/i.test(s.url ?? ""));

  const trustFactors: string[] = [];
  let trustScore: number | null = null;
  if (gp?.rating != null || gp?.reviewCount != null) {
    let t = 50;
    if (gp.rating != null) {
      t += (gp.rating - 4) * 20;
      trustFactors.push(`Google rating ${gp.rating.toFixed(1)}`);
    }
    if (gp.reviewCount != null) {
      if (gp.reviewCount >= 200) t += 12;
      else if (gp.reviewCount >= 50) t += 6;
      trustFactors.push(`${gp.reviewCount.toLocaleString("en-GB")} reviews`);
    }
    if (gp.photoCount != null && gp.photoCount >= 20) {
      t += 8;
      trustFactors.push(`${gp.photoCount} Google photos`);
    } else if (gp.photoCount != null && gp.photoCount < 10) {
      t -= 6;
      trustFactors.push("Few Google photos");
    }
    trustScore = Math.max(15, Math.min(95, Math.round(t)));
  }

  return {
    version: "growth-report-v2",
    hero: {
      title: "Restaurant Growth Report",
      subtitle:
        "We've analysed your website, Google presence, reviews and social channels to identify where you may be missing potential customers.",
      restaurantName: meta.restaurantName,
      cuisine: cuisineDisplayLabel(meta.restaurantName, meta.websiteUrl),
      location: meta.city || "Your area",
      analysedAtLabel: formatDateLabel(meta.analysedAt),
    },
    growthPotential: {
      band,
      score: Math.round(growthScore),
      explanation: growthPotentialExplanation(band, Math.round(growthScore)),
    },
    monthlyOpportunity: {
      customersLow,
      customersHigh,
    },
    channelImpact,
    benchmarks: buildBenchmarks(payload),
    competitors: buildCompetitors(payload),
    topImprovements,
    websiteHealth: plainWebsiteStatements(payload.issues ?? []),
    googlePresence: {
      rating: gp?.rating ?? null,
      reviewCount: gp?.reviewCount ?? null,
      photoCount: gp?.photoCount ?? null,
      strengths: [
        ...(gp?.rating != null && gp.rating >= 4.3 ? ["Solid Google rating"] : []),
        ...(gp?.reviewCount != null && gp.reviewCount >= 100 ? ["Healthy review volume"] : []),
        ...(gp?.photoCount != null && gp.photoCount >= 30 ? ["Good photo coverage"] : []),
      ],
      weaknesses: [
        ...(gp?.rating != null && gp.rating < 4.2 ? ["Rating trails stronger local peers"] : []),
        ...(gp?.photoCount != null && gp.photoCount < 15 ? ["Too few Google photos"] : []),
        ...(gp == null ? ["Google Business details incomplete in this scan"] : []),
      ],
    },
    socialPresence: {
      channels: [
        { name: "Instagram", status: hasIg ? "Linked on your site" : "Not found on website" },
        { name: "Facebook", status: hasFb ? "Linked on your site" : "Not found on website" },
        { name: "TikTok", status: hasTt ? "Linked on your site" : "Not found on website" },
      ],
      summary: hasIg
        ? "Social profiles are linked — posting consistency needs a deeper check (coming soon)."
        : "We couldn't find active social links on your website. Guests often check Instagram before visiting.",
    },
    customerTrust: {
      score: trustScore,
      label:
        trustScore == null
          ? "Not enough data"
          : trustScore >= 75
            ? "Strong"
            : trustScore >= 55
              ? "Mixed"
              : "At risk",
      factors: trustFactors.length ? trustFactors : ["Limited Google profile data in this scan"],
    },
    quickWins: buildQuickWins(topImprovements),
    weeklyTracking: {
      today: Math.round(growthScore),
      potential: Math.round(projected),
    },
    finalCta: {
      headline: "Ready to improve these automatically?",
      body: "KOB continuously monitors your restaurant and helps fix issues before they start affecting customer growth.",
      primaryHref: "/signup",
      primaryLabel: "Start Free Trial",
      secondaryHref: "/demo",
      secondaryLabel: "Book Demo",
    },
  };
}
