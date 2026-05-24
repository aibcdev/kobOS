import type { AuditNetworkFact } from "@/lib/audit/network-capture";
import type { AuditVisualIntelligenceResult } from "@/lib/audit/visual-intelligence";

/** Result of loading a page in a remote Browserbase Chromium session. */
export type BrowserbaseRenderedPage = {
  html: string;
  finalUrl: string;
  sessionId: string;
  statusCode: number | null;
  /** Viewport screenshot heuristics when capture is enabled. */
  visualMetrics?: AuditVisualIntelligenceResult;
  /** Public URL after optional Supabase Storage upload. */
  screenshotPublicUrl?: string;
  /** Redacted same-origin network samples from CDP (browser-trace style). */
  networkFacts?: AuditNetworkFact[];
};
