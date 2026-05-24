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
};

export function parseAuditPayload(json: unknown): AuditResultPayload | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (!o.scores || typeof o.scores !== "object") return null;
  if (!o.gated || typeof o.gated !== "object") return null;
  return json as AuditResultPayload;
}
