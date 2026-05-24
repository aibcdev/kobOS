import type {
  ImageCandidateUrl,
  PageEvidenceExtras,
  SocialLinkFound,
  UrlSignals,
} from "@/lib/audit/analyze-url";
import type { AuditNetworkFact } from "@/lib/audit/network-capture";
import type { PageSpeedInsightsSnapshot } from "@/lib/audit/pagespeed-insights";
import { resolveUrlAgainstPage } from "@/lib/audit/analyze-url";

export type AuditUserSocialInput = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  googleBusinessUrl?: string;
};

const MAX_PACK_IMAGE_CANDIDATES = 8;

function mergeImageCandidates(
  websiteUrl: string | null,
  fromPage: ImageCandidateUrl[],
  userImageUrls: string[] | undefined,
): ImageCandidateUrl[] {
  const seen = new Set<string>();
  const out: ImageCandidateUrl[] = [];
  const base = websiteUrl?.trim() ? (websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`) : null;
  const resolveBase = base ?? "https://kob.invalid/";

  function push(c: ImageCandidateUrl) {
    if (seen.has(c.url) || out.length >= MAX_PACK_IMAGE_CANDIDATES) return;
    seen.add(c.url);
    out.push(c);
  }

  for (const c of fromPage) push(c);

  let userIdx = 0;
  for (const raw of userImageUrls ?? []) {
    const t = raw?.trim();
    if (!t) continue;
    const resolved = resolveUrlAgainstPage(resolveBase, t);
    if (!resolved) continue;
    userIdx += 1;
    push({ ref: `user_image_${String(userIdx).padStart(2, "0")}`, url: resolved, source: "user:supplied" });
  }

  return out;
}

/** Compact, storable evidence for Gemini + audit trail (no raw HTML). */
export type AuditEvidencePackV1 = {
  version: 1;
  collectedAt: string;
  restaurantName: string;
  city: string;
  websiteUrl: string | null;
  userSocial: AuditUserSocialInput;
  /** Merged page + user-supplied public image URLs for vision pipeline (refs stable for evidenceRef). */
  imageCandidates?: ImageCandidateUrl[];
  urlSignals: UrlSignals;
  pageEvidence: {
    titleSnippet: string | null;
    metaDescriptionSnippet: string | null;
    socialLinksFound: SocialLinkFound[];
    contentFingerprint: string | null;
  };
  /** Filled after media fetch in Inngest; hashes only, no image bytes. */
  mediaAssetsMeta?: MediaAssetMetaV1[];
  /** When scores roll up multiple public origins (multi-location). */
  multiSiteOrigins?: string[];
  /** Google PageSpeed Insights (mobile) when API key configured. */
  pageSpeed?: PageSpeedInsightsSnapshot;
  /** Same-origin API samples from Browserbase CDP capture. */
  networkFacts?: AuditNetworkFact[];
};

export type MediaAssetMetaV1 = {
  ref: string;
  url: string;
  source: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
};

function trimUrl(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t || undefined;
}

export function buildEvidencePackV1(input: {
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
  userSocial?: AuditUserSocialInput | null;
  userImageUrls?: string[] | null;
  signals: UrlSignals;
  pageEvidence: PageEvidenceExtras;
  multiSiteOrigins?: string[] | null;
}): AuditEvidencePackV1 {
  const userSocial: AuditUserSocialInput = {
    instagram: trimUrl(input.userSocial?.instagram),
    facebook: trimUrl(input.userSocial?.facebook),
    tiktok: trimUrl(input.userSocial?.tiktok),
    googleBusinessUrl: trimUrl(input.userSocial?.googleBusinessUrl),
  };

  const websiteUrl = input.websiteUrl?.trim() || null;
  const imageCandidates = mergeImageCandidates(
    websiteUrl,
    input.pageEvidence.imageCandidates,
    input.userImageUrls ?? undefined,
  );

  return {
    version: 1,
    collectedAt: new Date().toISOString(),
    restaurantName: input.restaurantName.trim(),
    city: input.city.trim(),
    websiteUrl,
    userSocial,
    imageCandidates,
    urlSignals: input.signals,
    pageEvidence: {
      titleSnippet: input.pageEvidence.titleSnippet,
      metaDescriptionSnippet: input.pageEvidence.metaDescriptionSnippet,
      socialLinksFound: input.pageEvidence.socialLinksFound.slice(0, 12),
      contentFingerprint: input.pageEvidence.contentFingerprint,
    },
    ...(input.multiSiteOrigins?.length ? { multiSiteOrigins: input.multiSiteOrigins } : {}),
  };
}
