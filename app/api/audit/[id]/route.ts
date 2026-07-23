import { NextResponse } from "next/server";
import { parseAuditPayload } from "@/lib/audit/types";
import {
  buildPerceptionTeaserFromPayload,
  buildScanPreviewFromPayload,
} from "@/lib/marketing/audit-scan-preview";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Poll endpoint for scanning UI + locked/unlocked report refresh.
 * `?scanning=1` returns progress/preview only — never unlocks full report fields.
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const scanningPoll = new URL(req.url).searchParams.get("scanning") === "1";
  const audit = await prisma.visibilityAudit.findUnique({
    where: { id },
    select: {
      restaurantName: true,
      city: true,
      websiteUrl: true,
      updatedAt: true,
      resultPayload: true,
      leadCapturedAt: true,
      overallScore: true,
      seoScore: true,
      designScore: true,
      mobileScore: true,
      conversionScore: true,
    },
  });
  if (!audit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 500 });
  }

  const leadUnlocked = Boolean(audit.leadCapturedAt);
  const scanPreview = scanningPoll ? buildScanPreviewFromPayload(payload) : undefined;
  const perceptionTeaser =
    !leadUnlocked ? buildPerceptionTeaserFromPayload(payload, audit.overallScore) : undefined;

  if (scanningPoll && !leadUnlocked) {
    return NextResponse.json({
      restaurantName: audit.restaurantName,
      city: audit.city,
      websiteUrl: audit.websiteUrl,
      updatedAt: audit.updatedAt.toISOString(),
      locked: true,
      scoresPending: payload.scoresPending ?? false,
      scanStatus: payload.scanStatus,
      analysisProgress: payload.analysisProgress ?? null,
      restaurantScores: payload.restaurantScores ?? null,
      overallScore: 0,
      seoScore: 0,
      designScore: 0,
      mobileScore: 0,
      conversionScore: 0,
      scores: null,
      benchmarkV1Status: "pending",
      benchmarkV1: null,
      benchmarkV1MediaStatus: "pending",
      benchmarkV1Media: null,
      perceptionAuditV1Status: perceptionTeaser?.perceptionAuditV1Status ?? "pending",
      perceptionAuditV1: null,
      perceptionTeaser,
      browserbaseScan: null,
      evidencePack: null,
      geoLocation: payload.geoLocation ?? null,
      competitors: payload.competitors.slice(0, 8).map((c) => ({
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        source: c.source,
      })),
      scanPreview,
      opportunityReport: payload.opportunityReport ?? null,
    });
  }

  return NextResponse.json({
    restaurantName: audit.restaurantName,
    city: audit.city,
    websiteUrl: audit.websiteUrl,
    updatedAt: audit.updatedAt.toISOString(),
    locked: !leadUnlocked,
    scoresPending: payload.scoresPending ?? false,
    benchmarkV1Status: leadUnlocked ? payload.benchmarkV1Status : "pending",
    benchmarkV1: leadUnlocked ? (payload.benchmarkV1 ?? null) : null,
    benchmarkV1Error: leadUnlocked ? payload.benchmarkV1Error : undefined,
    benchmarkV1MediaStatus: leadUnlocked ? payload.benchmarkV1MediaStatus : "pending",
    benchmarkV1Media: leadUnlocked ? (payload.benchmarkV1Media ?? null) : null,
    benchmarkV1MediaError: leadUnlocked ? payload.benchmarkV1MediaError : undefined,
    perceptionAuditV1Status: leadUnlocked
      ? payload.perceptionAuditV1Status
      : (perceptionTeaser?.perceptionAuditV1Status ?? "pending"),
    perceptionAuditV1: leadUnlocked ? (payload.perceptionAuditV1 ?? null) : null,
    perceptionAuditV1Error: leadUnlocked ? payload.perceptionAuditV1Error : undefined,
    perceptionTeaser: perceptionTeaser ?? undefined,
    scanStatus: payload.scanStatus,
    browserbaseScan: leadUnlocked ? (payload.browserbaseScan ?? null) : null,
    evidencePack: leadUnlocked && payload.evidencePack
      ? {
          imageCandidates: payload.evidencePack.imageCandidates,
          mediaAssetsMeta: payload.evidencePack.mediaAssetsMeta,
        }
      : null,
    scores: leadUnlocked ? payload.scores : null,
    overallScore: leadUnlocked ? audit.overallScore : 0,
    seoScore: leadUnlocked ? audit.seoScore : 0,
    designScore: leadUnlocked ? audit.designScore : 0,
    mobileScore: leadUnlocked ? audit.mobileScore : 0,
    conversionScore: leadUnlocked ? audit.conversionScore : 0,
    geoLocation: payload.geoLocation ?? null,
    analysisProgress: leadUnlocked ? payload.analysisProgress ?? null : null,
    restaurantScores: leadUnlocked ? payload.restaurantScores ?? null : null,
    opportunityReport: payload.opportunityReport ?? null,
  });
}
