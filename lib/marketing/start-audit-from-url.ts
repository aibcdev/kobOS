import {
  auditInlineValidationMessage,
  AUDIT_URL_EMPTY_HINT,
  AUDIT_URL_HTTPS_HINT,
  AUDIT_URL_INVALID_HINT,
  parseAuditStartApiError,
  type AuditUserMessage,
} from "@/lib/audit/audit-start-errors";
import { looksLikeWebsiteInput, normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";

export type StartAuditResult =
  | { ok: true; auditId: string }
  | { ok: false; message: AuditUserMessage };

export function validateAuditWebsiteInput(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: AUDIT_URL_EMPTY_HINT };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    if (looksLikeWebsiteInput(trimmed)) {
      return { error: AUDIT_URL_HTTPS_HINT };
    }
    return { error: AUDIT_URL_INVALID_HINT };
  }

  const url = normalizeAuditWebsiteUrl(trimmed);
  if (!url) {
    return { error: AUDIT_URL_INVALID_HINT };
  }
  return { url };
}

export async function startAuditFromUrl(websiteUrl: string): Promise<StartAuditResult> {
  const resolved = validateAuditWebsiteInput(websiteUrl);
  if ("error" in resolved) {
    return { ok: false, message: auditInlineValidationMessage(resolved.error) };
  }

  let res: Response;
  try {
    res = await fetch("/api/audit/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteUrl: resolved.url }),
    });
  } catch {
    return {
      ok: false,
      message: auditInlineValidationMessage("Network error. Check your connection and try again."),
    };
  }

  const rawText = await res.text();
  let data: { id?: string; error?: string; hint?: string; code?: string; details?: unknown };
  try {
    data = rawText ? (JSON.parse(rawText) as typeof data) : {};
  } catch {
    return {
      ok: false,
      message: auditInlineValidationMessage("We got an unexpected response. Please try again."),
    };
  }

  if (!res.ok) {
    return { ok: false, message: parseAuditStartApiError(res.status, data) };
  }

  if (!data.id) {
    return {
      ok: false,
      message: auditInlineValidationMessage("We got an unexpected response. Please try again."),
    };
  }

  return { ok: true, auditId: data.id };
}

export function persistAuditScanSession(auditId: string) {
  try {
    sessionStorage.setItem(
      `kob-audit-scan-${auditId}`,
      JSON.stringify({ lat: null, lng: null, placeLabel: null, mapsConfigured: false }),
    );
  } catch {
    /* ignore */
  }
}
