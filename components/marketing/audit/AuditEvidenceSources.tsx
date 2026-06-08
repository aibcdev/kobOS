"use client";

import type { AuditResultPayload } from "@/lib/audit/types";

export type AuditEvidenceSource = {
  id: string;
  label: string;
};

export function collectAuditEvidenceSources(payload: AuditResultPayload): AuditEvidenceSource[] {
  const pack = payload.evidencePack;
  const sources: AuditEvidenceSource[] = [];

  if (pack?.websiteUrl || payload.browserbaseScan?.finalUrl) {
    sources.push({ id: "website", label: "Website" });
  }
  if (pack?.googlePlace) {
    sources.push({ id: "google", label: "Google Business" });
  }
  if (pack?.stagehandExtraction || payload.stagehandExtraction) {
    sources.push({ id: "stagehand", label: "Live page render" });
  } else if (payload.browserbaseScan?.screenshotPublicUrl) {
    sources.push({ id: "browserbase", label: "Homepage screenshot" });
  }
  const imageCount = pack?.mediaAssetsMeta?.length ?? pack?.imageCandidates?.length ?? 0;
  if (imageCount > 0) {
    sources.push({ id: "images", label: `${imageCount} image${imageCount === 1 ? "" : "s"} reviewed` });
  }
  const socialCount = pack?.pageEvidence.socialLinksFound?.length ?? 0;
  if (socialCount > 0) {
    sources.push({ id: "social", label: `${socialCount} social link${socialCount === 1 ? "" : "s"}` });
  }
  if (pack?.designQualityAnalysis) {
    sources.push({ id: "design-vision", label: "Homepage design reviewed visually" });
  } else if (pack?.foodImageAnalysis) {
    sources.push({ id: "visual", label: "Visual review" });
  }
  const placesCount = payload.competitors.filter((c) => c.source === "places").length;
  if (placesCount > 0) {
    sources.push({
      id: "competitors",
      label: `${placesCount} nearby competitor${placesCount === 1 ? "" : "s"}`,
    });
  } else if (payload.competitors.length > 0) {
    sources.push({
      id: "competitors",
      label: `${payload.competitors.length} competitor${payload.competitors.length === 1 ? "" : "s"}`,
    });
  }

  return sources;
}

export function formatEvidenceSourcesSummary(sources: AuditEvidenceSource[]): string {
  if (sources.length === 0) return "Website crawl only";
  const labels = sources.map((s) => s.label);
  if (labels.length <= 3) return labels.join(" · ");
  return `${labels.slice(0, 3).join(" · ")} +${labels.length - 3} more`;
}

export function AuditEvidenceSources({ payload }: { payload: AuditResultPayload }) {
  const sources = collectAuditEvidenceSources(payload);
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
      {sources.map((s) => (
        <span
          key={s.id}
          className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/80 px-3 py-1 text-xs font-medium text-[var(--color-muted)]"
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}

function websiteFetchLabel(payload: AuditResultPayload): string {
  if (payload.stagehandExtraction || payload.evidencePack?.stagehandExtraction) {
    return "Yes — full page render";
  }
  if (payload.browserbaseScan?.screenshotPublicUrl) {
    return "Yes — rendered with screenshot";
  }
  if (payload.evidencePack?.websiteUrl || payload.browserbaseScan?.finalUrl) {
    return "Yes — HTML crawl";
  }
  return "No website linked";
}

/** Trust block on Overview — what was actually reviewed. */
export function AuditEvidenceSourcesDetail({ payload }: { payload: AuditResultPayload }) {
  const pack = payload.evidencePack;
  const imageCount = pack?.mediaAssetsMeta?.length ?? pack?.imageCandidates?.length ?? 0;
  const reviewCount = pack?.googlePlace?.reviewCount;
  const placesCount = payload.competitors.filter((c) => c.source === "places").length;
  const design = pack?.designQualityAnalysis;

  const rows: { label: string; value: string }[] = [
    { label: "Website", value: websiteFetchLabel(payload) },
    { label: "Images analysed", value: imageCount > 0 ? String(imageCount) : "None found" },
    {
      label: "Google reviews",
      value:
        reviewCount != null && reviewCount > 0
          ? `${reviewCount} on listing`
          : pack?.googlePlace
            ? "Listing linked — limited review text"
            : "Not linked",
    },
    {
      label: "Competitors",
      value:
        placesCount > 0
          ? `${placesCount} from Google Places`
          : payload.competitors.length > 0
            ? `${payload.competitors.length} estimated`
            : "None found",
    },
    {
      label: "Design vision",
      value: design
        ? `Yes — score ${design.designQualityScore}/100 (${design.tier})`
        : "No — hero images unavailable",
    },
  ];

  return (
    <section className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
      <h2 className="font-head text-base font-semibold">What we reviewed</h2>
      <dl className="mt-4 divide-y divide-[var(--color-hairline)]">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
            <dt className="font-medium text-[var(--color-ink)]">{row.label}</dt>
            <dd className="text-[var(--color-muted)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
