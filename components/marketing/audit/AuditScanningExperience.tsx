"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";
import { AuditScanningBusinessCard } from "@/components/marketing/audit/AuditScanningBusinessCard";
import { AuditScanningMapPhase } from "@/components/marketing/audit/AuditScanningMapPhase";
import { AuditScanningReviewsScroll } from "@/components/marketing/audit/AuditScanningReviewsScroll";
import { AuditScanningStatusSheet } from "@/components/marketing/audit/AuditScanningStatusSheet";
import { AuditScanningWebsiteMobileDual } from "@/components/marketing/audit/AuditScanningWebsiteMobileDual";
import { AuditScanningDesignTipStrip } from "@/components/marketing/audit/AuditScanningDesignTipStrip";
import { marketingCopy } from "@/lib/marketing/copy";
import { pickScanDesignTip } from "@/lib/marketing/audit-scan-tips";
import type { AuditScanPreview } from "@/lib/marketing/audit-scan-preview";
import {
  graderCoordsFromCity,
  graderCountdownSeconds,
  graderPhaseProgress,
  resolveGraderPhase,
  type GraderScanPhase,
  type GraderScanSignals,
} from "@/lib/marketing/audit-grader-phases";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

const MIN_POLISH_MS = 2_000;
const MAX_DWELL_MS = 54_000;
const POLL_MS = 1400;
const PENDING_WARN_MS = 45_000;
const SKIP_KEY = (auditId: string) => `kob-audit-skip-${auditId}`;

type PollPayload = {
  restaurantName?: string;
  city?: string;
  websiteUrl?: string | null;
  scanStatus?: string;
  scoresPending?: boolean;
  benchmarkV1Status?: string;
  geoLocation?: { lat: number; lng: number; city?: string } | null;
  competitors?: { name: string; lat?: number; lng?: number; source?: string }[];
  scanPreview?: AuditScanPreview;
};

const isDev = process.env.NODE_ENV === "development";

function statusLineForPhase(phase: GraderScanPhase, name: string, websiteHost: string): string {
  switch (phase) {
    case "map":
      return marketingCopy.scanning.mapStatus(name);
    case "business":
      return marketingCopy.scanning.gbpStatus;
    case "website":
      return marketingCopy.scanning.websiteStatus(websiteHost || "your website");
    case "mobile":
      return marketingCopy.scanning.mobileStatus;
    case "reviews":
      return marketingCopy.scanning.reviewsStatus;
  }
}

function graderSignalsFromPreview(preview: AuditScanPreview | undefined): GraderScanSignals {
  const s = preview?.scanSignals;
  return {
    hasGeo: s?.hasGeo,
    hasGooglePlace: Boolean(preview?.googlePlace?.rating != null || preview?.googlePlace?.reviewCount != null),
    hasPreviewImage: Boolean(preview?.previewImageUrl),
    hasReviews: s?.hasReviews,
  };
}

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
  const [elapsedMs, setElapsedMs] = useState(0);
  const [poll, setPoll] = useState<PollPayload | null>(null);
  const startRef = useRef<number>(Date.now());

  const displayName = decodeHtmlEntities(poll?.restaurantName ?? initialName);
  const city = poll?.geoLocation?.city ?? poll?.city ?? initialCity;
  const website = poll?.websiteUrl ?? initialWebsiteUrl ?? "";
  const websiteHost = website.replace(/^https?:\/\//i, "").slice(0, 48);
  const preview = poll?.scanPreview;
  const previewImageUrl = preview?.previewImageUrl ?? null;
  const businessPhotoUrl = preview?.heroImageUrl ?? preview?.screenshotUrl ?? null;
  const googlePlace = preview?.googlePlace;
  const scanSignals = useMemo(() => graderSignalsFromPreview(preview), [preview]);

  const fallbackCoords = useMemo(() => graderCoordsFromCity(city || "London"), [city]);
  const lat = poll?.geoLocation?.lat ?? fallbackCoords.lat;
  const lng = poll?.geoLocation?.lng ?? fallbackCoords.lng;
  const mapCompetitors = useMemo(
    () =>
      (poll?.competitors ?? [])
        .filter((c): c is { name: string; lat: number; lng: number } => c.lat != null && c.lng != null)
        .map((c) => ({ name: c.name, lat: c.lat!, lng: c.lng! })),
    [poll?.competitors],
  );

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${auditId}?scanning=1`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PollPayload;
      setPoll(data);
    } catch {
      /* ignore */
    }
  }, [auditId]);

  useEffect(() => {
    void fetchPoll();
    const t = window.setInterval(() => void fetchPoll(), POLL_MS);
    return () => window.clearInterval(t);
  }, [fetchPoll]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 250);
    return () => window.clearInterval(tick);
  }, []);

  const scanFailed = poll?.scanStatus === "failed";
  const scanPending = poll?.scanStatus === "pending" || poll?.scoresPending || poll == null;
  const pendingWarn = scanPending && elapsedMs > PENDING_WARN_MS;
  const scanReady = poll != null && poll.scanStatus === "ready" && !poll.scoresPending;

  const phase = resolveGraderPhase(elapsedMs, scanReady, scanSignals);
  const progressPct = graderPhaseProgress(elapsedMs, scanReady, scanSignals);
  const secondsRemaining = graderCountdownSeconds(elapsedMs, scanReady);
  const statusLine = statusLineForPhase(phase, displayName, websiteHost);
  const showWebsiteMobile = phase === "website" || phase === "mobile";
  const designTip = useMemo(() => pickScanDesignTip(elapsedMs), [elapsedMs]);

  const skipToResults = useCallback(() => {
    try {
      sessionStorage.setItem(SKIP_KEY(auditId), "1");
    } catch {
      /* ignore */
    }
    router.replace(`/audit/${auditId}?preview=1`);
  }, [auditId, router]);

  const redirectScheduledRef = useRef(false);
  useEffect(() => {
    if (redirectScheduledRef.current) return;
    const timedOut = elapsedMs >= MAX_DWELL_MS;
    const readyToLeave = scanReady && (elapsedMs >= MIN_POLISH_MS || scanFailed);
    if (!timedOut && !readyToLeave) return;
    redirectScheduledRef.current = true;
    window.setTimeout(() => {
      router.replace(`/audit/${auditId}`);
    }, 300);
  }, [elapsedMs, scanReady, scanFailed, auditId, router]);

  const skipLabel = scanReady ? "View results" : isDev ? "Preview results (dev)" : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-warm)] text-[var(--color-ink)]">
      <AuditGraderHeader />

      <main className="relative flex flex-1 flex-col px-4 pb-36 pt-6 sm:px-6">
        <AuditScanningDesignTipStrip tip={designTip} />
        <div
          className={`mx-auto flex w-full flex-1 flex-col justify-center ${showWebsiteMobile ? "max-w-3xl" : "max-w-2xl"}`}
        >
          {phase === "map" ? (
            <AuditScanningMapPhase
              restaurantName={displayName}
              city={city}
              lat={lat}
              lng={lng}
              competitors={mapCompetitors}
            />
          ) : null}
          {phase === "business" ? (
            <AuditScanningBusinessCard
              restaurantName={displayName}
              city={city}
              lat={lat}
              lng={lng}
              rating={googlePlace?.rating}
              reviewCount={googlePlace?.reviewCount}
              photoUrl={businessPhotoUrl}
            />
          ) : null}
          {showWebsiteMobile ? (
            <AuditScanningWebsiteMobileDual websiteUrl={website} imageUrl={previewImageUrl} />
          ) : null}
          {phase === "reviews" ? (
            <AuditScanningReviewsScroll reviews={googlePlace?.reviews} />
          ) : null}
        </div>

        {scanFailed ? (
          <p className="mx-auto mt-6 max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-900">
            We could not finish this scan. Opening partial results…
          </p>
        ) : null}

        {pendingWarn && !scanFailed ? (
          <p className="mx-auto mt-6 max-w-md text-center text-sm text-[var(--color-muted)]">
            {isDev
              ? "Taking longer than usual — ensure npm run inngest:dev is running."
              : "Still working — this can take up to a minute on some sites."}
          </p>
        ) : null}

        {skipLabel && !scanReady ? (
          <button
            type="button"
            onClick={skipToResults}
            className="mx-auto mt-4 text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            {skipLabel}
          </button>
        ) : null}
      </main>

      <AuditScanningStatusSheet
        progress={progressPct}
        statusLine={statusLine}
        secondsRemaining={secondsRemaining}
        designTip={designTip}
      />
    </div>
  );
}
