import type { UrlSignals } from "@/lib/audit/analyze-url";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";

export type AuditEngagementSignals = {
  /** Estimated seconds a typical guest stays before bouncing (industry heuristics). */
  estimatedDwellSeconds: { low: number; high: number };
  /** 0–100 — higher = more likely to hold attention. */
  dwellScore: number;
  /** 0–100 — CTAs + newsletter + social + phone. */
  stayConnectedScore: number;
  rationale: string[];
  contentDepth: {
    visibleTextWords: number;
    sectionCount: number;
    hasMenuContent: boolean;
    hasStoryOrAbout: boolean;
    internalLinkCount: number;
  };
  ctaAudit: {
    bookReserve: boolean;
    orderOnline: boolean;
    phone: boolean;
    emailCapture: boolean;
    whatsApp: boolean;
    giftCards: boolean;
    socialLinkCount: number;
    heroCtaLabels: string[];
    conversionElementCount: number;
  };
};

function visibleTextWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 1).length;
}

function countSections(html: string): number {
  const tags = html.match(/<(section|article|main|header|footer)[\s>]/gi) ?? [];
  const h2 = html.match(/<h2[\s>]/gi) ?? [];
  return Math.max(tags.length, h2.length);
}

function internalLinkCount(html: string): number {
  return (html.match(/<a[^>]+href=["'][^"'#][^"']*["']/gi) ?? []).length;
}

function bool(re: RegExp, html: string) {
  return re.test(html);
}

export function computeEngagementSignals(
  html: string,
  signals: UrlSignals,
  stagehand?: AuditStagehandExtraction | null,
): AuditEngagementSignals {
  const words = visibleTextWords(html);
  const sections = countSections(html);
  const links = internalLinkCount(html);

  const hasMenuContent = bool(/\b(menu|menus|our dishes|small plates|tasting)\b/i, html);
  const hasStoryOrAbout = bool(/\b(our story|about us|who we are|our journey|heritage)\b/i, html);

  const bookReserve =
    signals.hasBookOrReserveKeyword ||
    signals.hasOpenTableOrResy ||
    bool(/\b(reservations?|book a table|book now|find a table)\b/i, html);
  const orderOnline = bool(/\b(order online|order now|delivery|click.?and.?collect|takeaway)\b/i, html);
  const phone = signals.hasTelLink;
  const emailCapture = bool(/\b(newsletter|subscribe|join our list|mailing list|email signup|get updates)\b/i, html);
  const whatsApp = bool(/wa\.me|whatsapp\.com/i, html);
  const giftCards = bool(/\b(gift card|voucher|e-?gift)\b/i, html);
  const socialLinkCount =
    (html.match(/instagram\.com|facebook\.com|tiktok\.com|youtube\.com/gi) ?? []).length;

  const heroCtaLabels = stagehand?.hero?.cta_buttons?.slice(0, 6) ?? [];
  const conversionElementCount = stagehand?.conversion_elements?.length ?? 0;

  const ctaCount =
    [bookReserve, orderOnline, phone, emailCapture, whatsApp, giftCards].filter(Boolean).length +
    Math.min(socialLinkCount, 3) +
    (heroCtaLabels.length > 0 ? 1 : 0);

  let dwellLow = 8;
  let dwellHigh = 22;
  const rationale: string[] = [];

  if (!signals.fetched || words < 80) {
    dwellLow = 3;
    dwellHigh = 12;
    rationale.push("Thin or unreachable page content — guests likely leave within seconds.");
  } else {
    if (words >= 400) {
      dwellLow += 12;
      dwellHigh += 25;
      rationale.push("Substantial on-page copy gives guests reason to read.");
    } else if (words >= 180) {
      dwellLow += 6;
      dwellHigh += 12;
    } else {
      dwellLow += 2;
      rationale.push("Limited readable content — browsing depth stays shallow.");
    }

    if (signals.imgCount >= 6) {
      dwellLow += 8;
      dwellHigh += 18;
      rationale.push("Rich imagery typically extends browsing time.");
    } else if (signals.imgCount >= 2) {
      dwellLow += 3;
      dwellHigh += 8;
    } else {
      rationale.push("Few images — weaker visual hook to keep guests scrolling.");
    }

    if (hasMenuContent) {
      dwellLow += 10;
      dwellHigh += 20;
      rationale.push("Menu content keeps hungry guests engaged.");
    }
    if (hasStoryOrAbout) {
      dwellLow += 6;
      dwellHigh += 14;
    }
    if (sections >= 4) {
      dwellLow += 4;
      dwellHigh += 10;
    }

    if (!signals.hasViewport) {
      dwellHigh = Math.max(dwellLow + 5, dwellHigh - 15);
      rationale.push("No mobile viewport — mobile guests bounce faster.");
    }
    if (signals.htmlSizeKb > 2500) {
      dwellHigh -= 8;
      rationale.push("Heavy page weight can slow mobile load and shorten visits.");
    }
  }

  dwellLow = Math.min(Math.max(dwellLow, 3), 90);
  dwellHigh = Math.min(Math.max(dwellHigh, dwellLow + 5), 180);

  let dwellScore = 35;
  dwellScore += Math.min(25, Math.round(words / 25));
  dwellScore += Math.min(18, signals.imgCount * 3);
  dwellScore += hasMenuContent ? 12 : 0;
  dwellScore += hasStoryOrAbout ? 6 : 0;
  dwellScore += sections >= 3 ? 8 : 0;
  if (!signals.hasViewport) dwellScore -= 15;
  if (words < 100) dwellScore -= 20;
  dwellScore = Math.min(100, Math.max(8, dwellScore));

  let stayConnected = 20;
  if (bookReserve) stayConnected += 22;
  if (orderOnline) stayConnected += 14;
  if (phone) stayConnected += 16;
  if (emailCapture) stayConnected += 12;
  if (whatsApp) stayConnected += 8;
  if (giftCards) stayConnected += 6;
  stayConnected += Math.min(18, socialLinkCount * 6);
  stayConnected += Math.min(12, conversionElementCount * 4);
  if (heroCtaLabels.length >= 2) stayConnected += 8;
  stayConnected = Math.min(100, Math.max(5, stayConnected));

  return {
    estimatedDwellSeconds: { low: dwellLow, high: dwellHigh },
    dwellScore,
    stayConnectedScore: stayConnected,
    rationale: rationale.slice(0, 5),
    contentDepth: {
      visibleTextWords: words,
      sectionCount: sections,
      hasMenuContent,
      hasStoryOrAbout,
      internalLinkCount: links,
    },
    ctaAudit: {
      bookReserve,
      orderOnline,
      phone,
      emailCapture,
      whatsApp,
      giftCards,
      socialLinkCount,
      heroCtaLabels,
      conversionElementCount,
    },
  };
}
