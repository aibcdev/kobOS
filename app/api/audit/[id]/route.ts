import { NextResponse } from "next/server";
import { findVisibilityAuditIdOrSlugSelect } from "@/lib/audit/find-audit-by-id-or-slug";
import { parseAuditPayload } from "@/lib/audit/types";
import { buildScanPreviewFromPayload } from "@/lib/marketing/audit-scan-preview";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Poll endpoint for scanning UI + report refresh.
 * Full audit is always public — no lead unlock gate.
 * `id` may be cuid or pretty slug.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const scanningPoll = new URL(req.url).searchParams.get("scanning") === "1";
  const audit = await findVisibilityAuditIdOrSlugSelect(id, {
    restaurantName: true,
    city: true,
    websiteUrl: true,
    updatedAt: true,
    resultPayload: true,
    overallScore: true,
    seoScore: true,
    designScore: true,
    mobileScore: true,
    conversionScore: true,
  });
  if (!audit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 500 });
  }

  const scanPreview = scanningPoll ? buildScanPreviewFromPayload(payload) : undefined;

  return NextResponse.json({
    restaurantName: audit.restaurantName,
    city: audit.city,
    websiteUrl: audit.websiteUrl,
    updatedAt: audit.updatedAt.toISOString(),
    locked: false,
    scoresPending: payload.scoresPending ?? false,
    benchmarkV1Status: payload.benchmarkV1Status,
    benchmarkV1: payload.benchmarkV1 ?? null,
    benchmarkV1Error: payload.benchmarkV1Error,
    benchmarkV1MediaStatus: payload.benchmarkV1MediaStatus,
    benchmarkV1Media: payload.benchmarkV1Media ?? null,
    benchmarkV1MediaError: payload.benchmarkV1MediaError,
    perceptionAuditV1Status: payload.perceptionAuditV1Status,
    perceptionAuditV1: payload.perceptionAuditV1 ?? null,
    perceptionAuditV1Error: payload.perceptionAuditV1Error,
    scanStatus: payload.scanStatus,
    browserbaseScan: payload.browserbaseScan ?? null,
    evidencePack: payload.evidencePack
      ? {
          imageCandidates: payload.evidencePack.imageCandidates,
          mediaAssetsMeta: payload.evidencePack.mediaAssetsMeta,
        }
      : null,
    scores: payload.scores ?? null,
    overallScore: audit.overallScore,
    seoScore: audit.seoScore,
    designScore: audit.designScore,
    mobileScore: audit.mobileScore,
    conversionScore: audit.conversionScore,
    geoLocation: payload.geoLocation ?? null,
    analysisProgress: payload.analysisProgress ?? null,
    restaurantScores: payload.restaurantScores ?? null,
    opportunityReport: payload.opportunityReport ?? null,
    ...(scanPreview ? { scanPreview } : {}),
    ...(scanningPoll
      ? {
          competitors: payload.competitors.slice(0, 8).map((c) => ({
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            source: c.source,
          })),
        }
      : {}),
  });
}
