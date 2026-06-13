import { isBrowserbaseConfigured } from "@/lib/browserbase/browserbase-config";

/** Audits use Browserbase when explicitly enabled or when keys exist (default-on when configured). */
export function isAuditBrowserbaseEnabled(): boolean {
  if (process.env.AUDIT_BROWSERBASE === "0") return false;
  if (process.env.AUDIT_BROWSERBASE === "1") return isBrowserbaseConfigured();
  return isBrowserbaseConfigured();
}
