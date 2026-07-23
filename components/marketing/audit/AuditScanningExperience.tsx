"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AuditLiveAnalysis } from "@/components/marketing/audit/AuditLiveAnalysis";
import type { AnalysisProgressV1 } from "@/lib/audit/types";
import type { AuditScanPreview } from "@/lib/marketing/audit-scan-preview";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

const POLL_MS = 1500;
const MIN_DWELL_MS = 2_500;
const MAX_DWELL_MS = 90_000;

type PollPayload = {
  restaurantName?: string;
  city?: string;
  websiteUrl?: string | null;
  scanStatus?: string;
  scoresPending?: boolean;
  analysisProgress?: AnalysisProgressV1 | null;
  restaurantScores?: { overall: number; grade: string } | null;
  scanPreview?: AuditScanPreview;
};

export function AuditScanningExperience({
  auditId,
  initialName,
  initialWebsiteUrl,
  initialCity = "",
}: {
  auditId: string;
  initialName: string;
  initialWebsiteUrl: string;
  initialCity?: string;
}) {
  const router = useRouter();
  const [poll, setPoll] = useState<PollPayload | null>(null);
  const startRef = useRef(Date.now());
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/audit/${auditId}?scanning=1`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as PollPayload;
        if (!cancelled) setPoll(json);
      } catch {
        /* ignore transient poll errors */
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [auditId]);

  useEffect(() => {
    if (redirected.current) return;
    const elapsed = Date.now() - startRef.current;
    const progress = poll?.analysisProgress;
    const scoresReady = poll?.restaurantScores != null;
    const scanReady = poll?.scanStatus === "ready" || poll?.scanStatus === "failed";
    const progressDone = progress?.status === "completed" || progress?.status === "failed";

    const canLeave =
      elapsed >= MIN_DWELL_MS &&
      ((progressDone && scoresReady) || (scanReady && scoresReady) || elapsed >= MAX_DWELL_MS);

    if (!canLeave) return;
    redirected.current = true;
    router.replace(`/audit/${auditId}`);
  }, [auditId, poll, router]);

  const displayName = decodeHtmlEntities(poll?.restaurantName ?? initialName);
  const city = poll?.city ?? initialCity;
  const website = poll?.websiteUrl ?? initialWebsiteUrl ?? "";
  const websiteHost = website.replace(/^https?:\/\//i, "").replace(/\/$/, "").slice(0, 48);
  const preview = poll?.scanPreview;
  const previewImageUrl = preview?.previewImageUrl ?? preview?.screenshotUrl ?? preview?.heroImageUrl ?? null;

  return (
    <AuditLiveAnalysis
      mode="live"
      restaurantName={displayName}
      websiteHost={websiteHost}
      city={city}
      progress={poll?.analysisProgress ?? null}
      preview={preview}
      previewImageUrl={previewImageUrl}
      showChrome
      showLogoWall
    />
  );
}
