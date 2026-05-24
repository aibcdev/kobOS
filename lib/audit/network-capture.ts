/** Redacted network sample for rubric + evidence (browser-trace style, in-process). */
export type AuditNetworkFact = {
  method: string;
  path: string;
  status: number;
  contentType: string | null;
  /** Short JSON keys or text preview when response was JSON. */
  responsePreview: string | null;
};

const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);

const NOISE_PATH =
  /\/(track|pixel|beacon|impression|pageview|akam|sensor|analytics|gtm|facebook|doubleclick|googletagmanager)/i;

const MAX_FACTS = 24;
const MAX_PREVIEW = 400;

export function shouldCaptureNetworkUrl(url: string, allowedHost: string): boolean {
  try {
    const u = new URL(url);
    if (NOISE_PATH.test(u.pathname)) return false;
    if (u.hostname === allowedHost || u.hostname.endsWith(`.${allowedHost}`)) return true;
    return false;
  } catch {
    return false;
  }
}

export function hostFromAuditUrl(websiteUrl: string): string {
  try {
    return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "";
  }
}

export function redactHeaderNames(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = v.slice(0, 120);
    }
  }
  return out;
}

export function previewResponseBody(body: string, contentType: string | null): string | null {
  const t = body.trim();
  if (!t) return null;
  const ct = contentType?.toLowerCase() ?? "";
  if (ct.includes("json") || t.startsWith("{") || t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t) as unknown;
      if (parsed && typeof parsed === "object") {
        const keys = Object.keys(parsed as object).slice(0, 12);
        return `json keys: ${keys.join(", ")}`.slice(0, MAX_PREVIEW);
      }
    } catch {
      /* fall through */
    }
  }
  return t.replace(/\s+/g, " ").slice(0, MAX_PREVIEW);
}

export function mergeNetworkFacts(facts: AuditNetworkFact[]): AuditNetworkFact[] {
  const seen = new Set<string>();
  const out: AuditNetworkFact[] = [];
  for (const f of facts) {
    const key = `${f.method}:${f.path}:${f.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
    if (out.length >= MAX_FACTS) break;
  }
  return out;
}
