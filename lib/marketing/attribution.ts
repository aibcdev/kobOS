/**
 * Paid-acquisition attribution helpers (Google Ads → audit → trial).
 */

export type AuditAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  landingPath?: string;
};

export const KOB_B2B_CAMPAIGN = "kob_b2b_audit";

export function parseAttributionFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AuditAttribution {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() || undefined;
    }
    const v = params[key];
    if (Array.isArray(v)) return v[0]?.trim() || undefined;
    return v?.trim() || undefined;
  };

  return {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    gclid: get("gclid"),
    landingPath: get("landing_path") || get("landingPath"),
  };
}

/** Read attribution from the browser URL (and sessionStorage fallback). */
export function readBrowserAttribution(): AuditAttribution {
  if (typeof window === "undefined") return {};
  const fromUrl = parseAttributionFromSearchParams(new URLSearchParams(window.location.search));
  const path = window.location.pathname;
  const merged: AuditAttribution = {
    ...fromUrl,
    landingPath: fromUrl.landingPath || path,
  };

  try {
    const key = "kob_attr_v1";
    const hasAny = Boolean(
      merged.utmSource || merged.utmMedium || merged.utmCampaign || merged.gclid,
    );
    if (hasAny) {
      sessionStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    const raw = sessionStorage.getItem(key);
    if (!raw) return { landingPath: path };
    return { ...(JSON.parse(raw) as AuditAttribution), landingPath: path };
  } catch {
    return merged;
  }
}

export function isPaidGoogleAttribution(a: AuditAttribution | null | undefined): boolean {
  if (!a) return false;
  if (a.gclid) return true;
  if (a.utmSource?.toLowerCase() === "google" && a.utmMedium?.toLowerCase() === "cpc") return true;
  if (a.utmCampaign?.toLowerCase().includes("kob_b2b")) return true;
  return false;
}
