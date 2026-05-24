import type { UrlSignals, WebsiteAnalysis } from "@/lib/audit/analyze-url";

function avgBool(values: boolean[]): boolean {
  if (values.length === 0) return false;
  const t = values.filter(Boolean).length;
  return t / values.length >= 0.5;
}

/** Average technical signals across N public sites (multi-location roll-up). */
export function averageUrlSignals(items: UrlSignals[]): UrlSignals {
  if (items.length === 0) {
    return {
      fetched: false,
      titleLen: 0,
      hasMetaDescription: false,
      h1Count: 0,
      hasOgTitle: false,
      hasCanonical: false,
      hasJsonLd: false,
      hasViewport: false,
      isHttps: false,
      hasTelLink: false,
      hasMailto: false,
      hasBookOrReserveKeyword: false,
      hasOpenTableOrResy: false,
      imgCount: 0,
      htmlSizeKb: 0,
      hasOgImage: false,
      hasTwitterCard: false,
      mentionsRobotsOrSitemap: false,
    };
  }
  if (items.length === 1) return { ...items[0] };

  const n = items.length;
  const roundAvg = (fn: (i: UrlSignals) => number) => Math.round(items.reduce((s, i) => s + fn(i), 0) / n);

  const codes = items.map((i) => i.status).filter((s): s is number => s != null);

  return {
    fetched: items.some((i) => i.fetched),
    status: codes.length ? Math.max(...codes) : undefined,
    titleLen: roundAvg((i) => i.titleLen),
    hasMetaDescription: avgBool(items.map((i) => i.hasMetaDescription)),
    h1Count: roundAvg((i) => i.h1Count),
    hasOgTitle: avgBool(items.map((i) => i.hasOgTitle)),
    hasCanonical: avgBool(items.map((i) => i.hasCanonical)),
    hasJsonLd: avgBool(items.map((i) => i.hasJsonLd)),
    hasViewport: avgBool(items.map((i) => i.hasViewport)),
    isHttps: avgBool(items.map((i) => i.isHttps)),
    hasTelLink: avgBool(items.map((i) => i.hasTelLink)),
    hasMailto: avgBool(items.map((i) => i.hasMailto)),
    hasBookOrReserveKeyword: avgBool(items.map((i) => i.hasBookOrReserveKeyword)),
    hasOpenTableOrResy: avgBool(items.map((i) => i.hasOpenTableOrResy)),
    imgCount: roundAvg((i) => i.imgCount),
    htmlSizeKb: roundAvg((i) => i.htmlSizeKb),
    hasOgImage: avgBool(items.map((i) => i.hasOgImage)),
    hasTwitterCard: avgBool(items.map((i) => i.hasTwitterCard)),
    mentionsRobotsOrSitemap: avgBool(items.map((i) => i.mentionsRobotsOrSitemap)),
  };
}

export function mergeWebsiteAnalyses(analyses: WebsiteAnalysis[]): WebsiteAnalysis {
  if (analyses.length === 0) {
    throw new Error("mergeWebsiteAnalyses: empty");
  }
  if (analyses.length === 1) {
    return analyses[0];
  }

  const primary = analyses[0];
  const signals = averageUrlSignals(analyses.map((a) => a.signals));

  const seenImg = new Set<string>();
  const imageCandidates: typeof primary.pageEvidence.imageCandidates = [];
  for (const a of analyses) {
    for (const c of a.pageEvidence.imageCandidates) {
      if (seenImg.has(c.url) || imageCandidates.length >= 8) continue;
      seenImg.add(c.url);
      imageCandidates.push(c);
    }
  }

  const seenSoc = new Set<string>();
  const socialLinksFound: typeof primary.pageEvidence.socialLinksFound = [];
  for (const a of analyses) {
    for (const s of a.pageEvidence.socialLinksFound) {
      const key = `${s.platform}:${s.url}`;
      if (seenSoc.has(key)) continue;
      seenSoc.add(key);
      socialLinksFound.push(s);
      if (socialLinksFound.length >= 12) break;
    }
  }

  return {
    signals,
    pageEvidence: {
      titleSnippet: primary.pageEvidence.titleSnippet,
      metaDescriptionSnippet: primary.pageEvidence.metaDescriptionSnippet,
      socialLinksFound,
      contentFingerprint: primary.pageEvidence.contentFingerprint,
      imageCandidates,
    },
  };
}
