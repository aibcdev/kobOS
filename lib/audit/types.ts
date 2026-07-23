import type { AuditFoodImageAnalysis } from "@/lib/audit/analyze-food-images";
import type { AuditEngagementSignals } from "@/lib/audit/engagement-signals";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { RubricV2Result } from "@/lib/audit/rubric-v2";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";

export type AuditIssue = {
  title: string;
  impact: "high" | "medium" | "low";
  fixHint: string;
};

export type AuditOpportunity = {
  title: string;
  impactEstimate: string;
};

export type AuditCompetitor = {
  name: string;
  note: string;
  mockScore: number;
  /** Real Google Places listing when location was resolved. */
  source?: "places" | "estimated";
  lat?: number;
  lng?: number;
};

export type AuditGeoLocation = {
  lat: number;
  lng: number;
  city: string;
  source: "place_input" | "places_website" | "json_ld" | "meta_geo" | "default";
  placeId?: string;
};

export type AuditCompetitorDeep = {
  name: string;
  strengths: string[];
  gaps: string[];
};

export type BenchmarkV1Section = {
  score: number;
  confidence: "low" | "medium" | "high";
  checks: { id: string; pass: boolean; detail: string; evidenceRef: string }[];
  topGaps: string[];
  nextActions: string[];
};

/** Structured absolute benchmark from Gemini Flash (async). */
export type BenchmarkV1Result = {
  version: 1;
  model: string;
  scoredAt: string;
  seo: BenchmarkV1Section;
  websiteExperience: BenchmarkV1Section;
  brandSocialPresence: BenchmarkV1Section;
  overallSummary?: string;
  anchorCalibrationNote?: string;
};

/** Vision add-on: scores public images attached to the audit (async). */
export type BenchmarkV1MediaResult = {
  version: 1;
  model: string;
  scoredAt: string;
  visualBrandQuality: BenchmarkV1Section;
  /** Hero video / poster UX when video posters were detected on the page. */
  videoPresentationQuality?: BenchmarkV1Section;
  visualSummary?: string;
  videoSummary?: string;
};

/** Hospitality perception intelligence (async Gemini). */
export type PerceptionVisualScorecardRow = {
  category: string;
  scoreOutOf10: number;
  note: string;
};

export type PerceptionOwnerHero = {
  revenueHeadline: string;
  bookingLeakPercentLow: number;
  bookingLeakPercentHigh: number;
  monthlyRevenueBandLowGbp?: number;
  monthlyRevenueBandHighGbp?: number;
  revenueDetail: string;
  customerLossBullets: string[];
  timelineHeadline: string;
  timelinePhases: { window: string; outcome: string }[];
  comparedToLabel: string;
};

export type PerceptionAuditV1 = {
  version: 1;
  model: string;
  scoredAt: string;
  digitalPositioningScore: number;
  confidence: "low" | "medium" | "high";
  coverHeadline?: string;
  coverSubheadline?: string;
  executiveSummary?: {
    strengths: string[];
    gapStatement: string;
    impacts: string[];
  };
  visualScorecard?: PerceptionVisualScorecardRow[];
  estimatedDwellSeconds?: { low: number; high: number; rationale: string };
  positioningTable: { area: string; current: string; ideal: string }[];
  perceptionGap: { metric: string; current: string; potential: string; note?: string }[];
  customerExperience: string;
  modernStandard: string;
  reviewIntelligence: {
    praiseThemes: string[];
    complaintThemes: string[];
    disconnect: string;
  };
  socialAnalysis: string;
  commercialSeo: string;
  revenueLeaks: { title: string; impact: "high" | "medium" | "low"; narrative: string }[];
  benchmarkAnchors: string[];
  overallSummary: string;
  ownerHero?: PerceptionOwnerHero;
};

/** Browserbase / Stagehand capture metadata (no raw session secrets exposed to the client). */
export type AuditBrowserbaseScan = {
  capturedAt: string;
  /** Browserbase session id when a cloud session was used. */
  sessionId?: string;
  finalUrl?: string;
  mode: "sync" | "async-pending" | "async-complete" | "async-failed";
  errorMessage?: string;
  /** Short text preview for support / internal tooling (not full page dump). */
  approximateMarkdownSnippet?: string;
  /** Public URL after optional Supabase Storage upload. */
  screenshotPublicUrl?: string;
  /** Support log: geo + competitor resolution stage after pipeline run. */
  pipelineStage?: string;
};

export type AuditScanStatus = "pending" | "ready" | "failed";

export type AuditResultPayload = {
  /** When true, UI must not show headline scores (scan still running). */
  scoresPending?: boolean;
  scores: {
    overall: number;
    seo: number;
    design: number;
    mobile: number;
    conversion: number;
  };
  /** Deterministic rubric scores (primary headline source when present). */
  rubricV2?: RubricV2Result;
  issues: AuditIssue[];
  opportunities: AuditOpportunity[];
  competitors: AuditCompetitor[];
  /** Resolved coordinates for map + nearby competitor lookup. */
  geoLocation?: AuditGeoLocation | null;
  teaser: {
    headline: string;
    subline: string;
    paletteNote: string;
  };
  /** Deep-render scan (Browserbase) state for polling + support. */
  scanStatus?: AuditScanStatus;
  browserbaseScan?: AuditBrowserbaseScan;
  /** Viewport screenshot heuristics when Browserbase capture ran. */
  visualMetrics?: AuditVisualIntelligenceResult;
  /** Stagehand LLM extraction when AUDIT_STAGEHAND=1 */
  stagehandExtraction?: AuditStagehandExtraction;
  gated: {
    keywordOpportunities: string[];
    roadmap: { days30: string[]; days60: string[]; days90: string[] };
    competitorDeepDive: AuditCompetitorDeep[];
    redesignPreviewNotes: string;
  };
  /** Optional; may be filled async via Inngest + OpenAI */
  aiNarrative?: string;
  /** Deterministic crawl + user inputs; written at audit creation. */
  evidencePack?: AuditEvidencePackV1;
  /** Set when Gemini benchmark is queued or finished. */
  benchmarkV1Status?: "pending" | "ready" | "failed";
  benchmarkV1?: BenchmarkV1Result | null;
  benchmarkV1Error?: string;
  /** Multimodal image scoring; pending when imageCandidates exist and GEMINI is on. */
  benchmarkV1MediaStatus?: "pending" | "ready" | "failed" | "skipped";
  benchmarkV1Media?: BenchmarkV1MediaResult | null;
  benchmarkV1MediaError?: string;
  /** Hospitality perception audit (async Gemini). */
  perceptionAuditV1Status?: "pending" | "ready" | "failed";
  perceptionAuditV1?: PerceptionAuditV1 | null;
  perceptionAuditV1Error?: string;
  /** Restaurant-calibrated multi-axis scores (preferred on Overview). */
  restaurantScores?: RestaurantScoresV1;
  /** Live analysis step progress for scanning UI. */
  analysisProgress?: AnalysisProgressV1;
  /** Post-scan Opportunity Report (revenue / maturity / lost customers). */
  opportunityReport?: AuditOpportunityReportV1;
};

export type AuditOpportunityFix = {
  title: string;
  detail: string;
  /** Estimated customers recovered per month if this win is fixed. */
  customersPerMonth: number;
};

export type AuditNearbyComparisonRow = {
  label: string;
  you: string;
  nearby: string;
};

/** Persisted on audit payload after scan — drives Opportunity Report UI. */
export type AuditOpportunityReportV1 = {
  version: string;
  place_id: string | null;
  name: string;
  status: "qualified" | "park" | "discard";
  disqualifiers: string[];
  opportunity_score: {
    revenue_potential: number;
    marketing_maturity: number;
    likelihood_to_buy: number;
    est_monthly_lost_customers: number;
    est_lost_revenue: number;
    currency: string;
  } | null;
  fit_proxy: number | null;
  reasons: string[];
  personalization_hooks: string[];
  recommended_email_angle: string | null;
  locationLabel: string;
  /** City only when single-site confidence is high; null for multi-site. */
  displayCity?: string | null;
  footprintConfidence?: "high" | "medium" | "low";
  topFixes: AuditOpportunityFix[];
  /** Owner-facing growth score (higher = healthier). */
  growthScore?: number;
  /** e.g. 37 meaning "Bottom 37%". */
  peerPercentileBottom?: number;
  /** Score if the three biggest wins are fixed (illustrative). */
  projectedGrowthScore?: number;
  nearbyComparison?: AuditNearbyComparisonRow[];
};

export type RestaurantGrade = "A" | "B" | "C" | "D" | "F";

export type RestaurantScoresV1 = {
  overall: number;
  grade: RestaurantGrade;
  reviews: number;
  gbp: number;
  website: number;
  competitors: number;
  technical: number;
  confidence: "low" | "medium" | "high";
  dataGaps?: string[];
};

export type AnalysisStepId = "website" | "reviews" | "local" | "competitors" | "technical";

export type AnalysisStepStatus = "pending" | "running" | "done" | "failed";

export type AnalysisProgressV1 = {
  status: "queued" | "running" | "completed" | "failed";
  percent: number;
  currentStep: string;
  steps: {
    id: AnalysisStepId;
    status: AnalysisStepStatus;
    detail?: string;
  }[];
};

export function parseAuditPayload(json: unknown): AuditResultPayload | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (!o.scores || typeof o.scores !== "object") return null;
  if (!o.gated || typeof o.gated !== "object") return null;
  return json as AuditResultPayload;
}
