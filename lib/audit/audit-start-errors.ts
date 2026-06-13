/** User-facing copy for audit start failures (Owner-style: calm, non-technical). */

export const AUDIT_URL_HTTPS_HINT =
  "Please include https:// at the start — e.g. https://cowpigchicken.co.uk";

export const AUDIT_URL_EMPTY_HINT =
  "Enter your restaurant website starting with https:// — e.g. https://turtlebay.co.uk";

export const AUDIT_URL_INVALID_HINT =
  "Enter a valid website starting with https:// — e.g. https://turtlebay.co.uk";

export type AuditStartErrorCode =
  | "database_unreachable"
  | "database_schema"
  | "background_unavailable"
  | "rate_limited"
  | "validation"
  | "unknown";

export type AuditUserMessage = {
  code: AuditStartErrorCode;
  title: string;
  message: string;
  /** Shown only when API sends `hint` (dev) or NODE_ENV is development. */
  devHint?: string;
};

const MESSAGES: Record<AuditStartErrorCode, Omit<AuditUserMessage, "code" | "devHint">> = {
  database_unreachable: {
    title: "Report temporarily unavailable",
    message:
      "We couldn't save your scan just now. Your details look fine—this is on our side. Wait a moment and try again.",
  },
  database_schema: {
    title: "We're still setting up",
    message: "The report tool isn't ready on this environment yet. Try again shortly, or book a demo and we'll run it for you.",
  },
  background_unavailable: {
    title: "Scan couldn't start in the background",
    message:
      "Your report needs a quick server hook-up on our end. Try again in a minute, or book a demo and we'll walk you through it.",
  },
  rate_limited: {
    title: "Please wait a moment",
    message: "You've started several scans recently. Try again in a few minutes so we can keep results accurate for everyone.",
  },
  validation: {
    title: "Check your details",
    message: "Something in the form needs a quick fix before we can run your AI report.",
  },
  unknown: {
    title: "Something went wrong",
    message: "We couldn't start your report. Try again, or book a free demo and we'll run it with you.",
  },
};

export function auditUserMessage(
  code: AuditStartErrorCode,
  devHint?: string,
): AuditUserMessage {
  return { code, ...MESSAGES[code], ...(devHint ? { devHint } : {}) };
}

type ApiErrorBody = {
  error?: string;
  hint?: string;
  code?: string;
  details?: unknown;
  retryAfterSec?: number;
};

export function parseAuditStartApiError(status: number, body: ApiErrorBody): AuditUserMessage {
  const hint = typeof body.hint === "string" ? body.hint : undefined;

  if (body.code === "database_unreachable" || body.error?.includes("Cannot reach the database")) {
    return auditUserMessage("database_unreachable", hint);
  }
  if (body.code === "database_schema" || body.error?.includes("missing the audit table")) {
    return auditUserMessage("database_schema", hint);
  }
  if (body.code === "background_unavailable" || body.error?.includes("Background scan unavailable")) {
    return auditUserMessage("background_unavailable", hint);
  }
  if (status === 429 || body.error?.includes("Too many audits")) {
    return auditUserMessage("rate_limited", hint);
  }
  if (status === 400) {
    return auditUserMessage("validation", body.error ?? hint);
  }

  if (body.error?.trim()) {
    return {
      code: "unknown",
      title: MESSAGES.unknown.title,
      message: body.error.trim(),
      devHint: hint,
    };
  }

  return auditUserMessage("unknown", hint);
}

/** Inline validation before submit (no API). */
export function auditInlineValidationMessage(text: string): AuditUserMessage {
  return {
    code: "validation",
    title: "Almost there",
    message: text,
  };
}
