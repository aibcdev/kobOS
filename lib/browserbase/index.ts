export { fetchRenderedPage, fetchRenderedPageWithRetry, isBrowserbaseConfigured } from "@/lib/browserbase/fetch-page";
export type { BrowserbaseRenderedPage } from "@/lib/browserbase/types";
export { isStagehandAuditEnabled } from "@/lib/browserbase/stagehand-config";
export {
  fetchRenderedPageViaStagehand,
  fetchRenderedPageViaStagehandWithRetry,
} from "@/lib/browserbase/stagehand-scan";
export type { StagehandRenderedPage } from "@/lib/browserbase/stagehand-scan";
