export type WebsiteStalenessResult = {
  stale: boolean;
  copyrightYear: number | null;
  reasons: string[];
};

export async function detectWebsiteStaleness(
  websiteUrl: string,
  weakWebsite: boolean,
): Promise<WebsiteStalenessResult> {
  const reasons: string[] = [];
  let copyrightYear: number | null = null;
  let stale = false;

  try {
    const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-LeadEngine/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { stale: weakWebsite, copyrightYear: null, reasons: ["fetch_failed"] };
    }

    const html = await res.text();
    const yearNow = new Date().getFullYear();

    const copyrightMatch = html.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
    if (copyrightMatch) {
      copyrightYear = Number(copyrightMatch[1] ?? copyrightMatch[2]);
      if (copyrightYear && copyrightYear <= yearNow - 2) {
        stale = true;
        reasons.push(`copyright_${copyrightYear}`);
      }
    }

    const lastModified = res.headers.get("last-modified");
    if (lastModified) {
      const mod = new Date(lastModified);
      if (!Number.isNaN(mod.getTime())) {
        const months =
          (Date.now() - mod.getTime()) / (30 * 86_400_000);
        if (months > 18) {
          stale = true;
          reasons.push("last_modified_old");
        }
      }
    }

    const hasBlog = /\b(blog|news|latest news|our journal)\b/i.test(html);
    if (!hasBlog && weakWebsite) {
      stale = true;
      reasons.push("no_blog_weak_design");
    }

    if (weakWebsite && !stale) {
      stale = true;
      reasons.push("weak_website_signals");
    }
  } catch {
    return { stale: weakWebsite, copyrightYear: null, reasons: ["error"] };
  }

  return { stale, copyrightYear, reasons };
}
