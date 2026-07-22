import { getLeadEngineConfig } from "@/lib/lead-engine/config";

export type WebsiteStalenessResult = {
  stale: boolean;
  copyrightYear: number | null;
  reasons: string[];
};

export async function detectWebsiteStaleness(
  websiteUrl: string,
): Promise<WebsiteStalenessResult> {
  const { staleWebsiteYears } = getLeadEngineConfig();
  const reasons: string[] = [];
  let copyrightYear: number | null = null;
  let stale = false;

  try {
    const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-LeadEngine/1.0 (+https://trykob.com)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { stale: false, copyrightYear: null, reasons: ["fetch_failed"] };
    }

    const html = await res.text();
    const yearNow = new Date().getFullYear();
    const cutoffYear = yearNow - staleWebsiteYears;

    const copyrightMatch = html.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
    if (copyrightMatch) {
      copyrightYear = Number(copyrightMatch[1] ?? copyrightMatch[2]);
      if (copyrightYear && copyrightYear <= cutoffYear) {
        stale = true;
        reasons.push(`copyright_${copyrightYear}`);
      }
    }

    const lastModified = res.headers.get("last-modified");
    if (lastModified) {
      const mod = new Date(lastModified);
      if (!Number.isNaN(mod.getTime())) {
        const months = (Date.now() - mod.getTime()) / (30 * 86_400_000);
        if (months > staleWebsiteYears * 12) {
          stale = true;
          reasons.push("last_modified_old");
        }
      }
    }
  } catch {
    return { stale: false, copyrightYear: null, reasons: ["error"] };
  }

  return { stale, copyrightYear, reasons };
}
