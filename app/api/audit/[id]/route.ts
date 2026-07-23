import { NextResponse } from "next/server";
import { parseAuditPayload } from "@/lib/audit/types";
import {
  buildPerceptionTeaserFromPayload,
  buildScanPreviewFromPayload,
} from "@/lib/marketing/audit-scan-preview";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/** Lightweight poll for async Gemini benchmark + updated headline scores. */
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
  const unlocked = leadUnlocked || scanningPoll;
  const scanPreview = scanningPoll ? buildScanPreviewFromPayload(payload) : undefined;
  const perceptionTeaser =
    !leadUnlocked && !scanningPoll ? buildPerceptionTeaserFromPayload(payload, audit.overallScore) : undefined;

  return NextResponse.json({
    restaurantName: audit.restaurantName,
    city: audit.city,
    websiteUrl: audit.websiteUrl,
    updatedAt: audit.updatedAt.toISOString(),
    locked: !leadUnlocked,
    scoresPending: payload.scoresPending ?? false,
    benchmarkV1Status: unlocked ? payload.benchmarkV1Status : "pending",
    benchmarkV1: unlocked ? (payload.benchmarkV1 ?? null) : null,
    benchmarkV1Error: unlocked ? payload.benchmarkV1Error : undefined,
    benchmarkV1MediaStatus: unlocked ? payload.benchmarkV1MediaStatus : "pending",
    benchmarkV1Media: unlocked ? (payload.benchmarkV1Media ?? null) : null,
    benchmarkV1MediaError: unlocked ? payload.benchmarkV1MediaError : undefined,
    perceptionAuditV1Status: unlocked
      ? payload.perceptionAuditV1Status
      : (perceptionTeaser?.perceptionAuditV1Status ?? "pending"),
    perceptionAuditV1: unlocked ? (payload.perceptionAuditV1 ?? null) : null,
    perceptionAuditV1Error: unlocked ? payload.perceptionAuditV1Error : undefined,
    perceptionTeaser: perceptionTeaser ?? undefined,
    scanStatus: payload.scanStatus,
    browserbaseScan: unlocked ? (payload.browserbaseScan ?? null) : null,
    evidencePack: unlocked && payload.evidencePack
      ? {
          imageCandidates: payload.evidencePack.imageCandidates,
          mediaAssetsMeta: payload.evidencePack.mediaAssetsMeta,
        }
      : null,
    scores: unlocked ? payload.scores : null,
    overallScore: unlocked ? audit.overallScore : 0,
    seoScore: unlocked ? audit.seoScore : 0,
    designScore: unlocked ? audit.designScore : 0,
    mobileScore: unlocked ? audit.mobileScore : 0,
    conversionScore: unlocked ? audit.conversionScore : 0,
    geoLocation: payload.geoLocation ?? null,
    analysisProgress: scanningPoll || unlocked ? payload.analysisProgress ?? null : null,
    restaurantScores: scanningPoll || unlocked ? payload.restaurantScores ?? null : null,
    competitors: scanningPoll
      ? payload.competitors.map((c) => ({
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          source: c.source,
        }))
      : undefined,
    scanPreview,
  });
}
