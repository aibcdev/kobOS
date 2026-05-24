import { resolveUrlAgainstPage } from "@/lib/audit/analyze-url";

const HREF_RE = /href\s*=\s*["']([^"']+)["']/gi;

/**
 * From a crawled homepage, collect other origins on the same registrable hostname
 * (e.g. www., subdomains) so multi-location brands can be scored together.
 */
export function discoverSiblingOrigins(pageUrl: string, html: string, maxSites: number): string[] {
  let primary: URL;
  try {
    primary = new URL(pageUrl);
  } catch {
    return [];
  }

  const primaryHostNorm = primary.hostname.replace(/^www\./i, "").toLowerCase();
  const primaryOrigin = primary.origin;

  const result: string[] = [primaryOrigin];
  const seen = new Set<string>([primaryOrigin]);

  let m: RegExpExecArray | null;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(html)) !== null && result.length < maxSites) {
    const resolved = resolveUrlAgainstPage(pageUrl, m[1]);
    if (!resolved) continue;
    let u: URL;
    try {
      u = new URL(resolved);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;

    const hostNorm = u.hostname.replace(/^www\./i, "").toLowerCase();
    const sameCompany =
      hostNorm === primaryHostNorm || hostNorm.endsWith(`.${primaryHostNorm}`);
    if (!sameCompany) continue;

    const origin = u.origin;
    if (seen.has(origin)) continue;
    seen.add(origin);
    result.push(origin);
  }

  return result;
}
