"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";
import { AuditScanningBusinessCard } from "@/components/marketing/audit/AuditScanningBusinessCard";
import { AuditScanningMobileLaser } from "@/components/marketing/audit/AuditScanningMobileLaser";
import { AuditScanningPhotoPanel } from "@/components/marketing/audit/AuditScanningPhotoPanel";
import { AuditScanningReviewsScroll } from "@/components/marketing/audit/AuditScanningReviewsScroll";
import { AuditScanningSidebar } from "@/components/marketing/audit/AuditScanningSidebar";
import { AuditScanningWebsitePreview } from "@/components/marketing/audit/AuditScanningWebsitePreview";
import type { AuditScanPreview } from "@/lib/marketing/audit-scan-preview";
import {
  graderContextStatus,
  graderCoordsFromCity,
  graderCountdownSeconds,
  graderPhaseProgress,
  resolveGraderPhase,
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
  geoLocation?: { lat: number; lng: number; city?: string } | null;
  competitors?: { name: string; lat?: number; lng?: number; source?: string }[];
  scanPreview?: AuditScanPreview;
};

const isDev = process.env.NODE_ENV === "development";

function graderSignalsFromPreview(preview: AuditScanPreview | undefined): GraderScanSignals {
  const s = preview?.scanSignals;
  return {
    hasGeo: s?.hasGeo,
    hasGooglePlace: Boolean(preview?.googlePlace?.rating != null || preview?.googlePlace?.reviewCount != null),
    hasPreviewImage: Boolean(preview?.previewImageUrl),
    hasReviews: s?.hasReviews,
    hasPhotos: s?.hasPhotos,
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
  const contextStatus = graderContextStatus(phase, scanSignals);
  const categoryLine = city && city !== "Your area" ? city : null;

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
    const stillPending = !scanReady && !scanFailed;
    if (stillPending) {
      try {
        sessionStorage.setItem(SKIP_KEY(auditId), "1");
      } catch {
        /* ignore */
      }
    }
    window.setTimeout(() => {
      router.replace(stillPending ? `/audit/${auditId}?preview=1` : `/audit/${auditId}`);
    }, 300);
  }, [elapsedMs, scanReady, scanFailed, auditId, router]);

  const skipLabel = scanReady ? "View results" : isDev ? "Preview results (dev)" : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-warm)] text-[var(--color-ink)]">
      <AuditGraderHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        <div className="w-full lg:w-[min(380px,36%)] lg:shrink-0">
          <AuditScanningSidebar
            phase={phase}
            signals={scanSignals}
            restaurantName={displayName}
            websiteHost={websiteHost}
            progressPct={progressPct}
            secondsRemaining={secondsRemaining}
          />
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:py-12">
          <AuditScanningBusinessCard
            restaurantName={displayName}
            city={city}
            lat={lat}
            lng={lng}
            rating={googlePlace?.rating}
            reviewCount={googlePlace?.reviewCount}
            photoUrl={businessPhotoUrl}
            categoryLine={categoryLine}
            statusLine={contextStatus}
            competitors={mapCompetitors}
          />

          <div className="mx-auto mt-6 w-full max-w-lg space-y-4">
            {phase === "reviewSentiment" && scanSignals.hasReviews ? (
              <AuditScanningReviewsScroll reviews={googlePlace?.reviews} />
            ) : null}
            {phase === "photoQuality" ? (
              <AuditScanningPhotoPanel
                imageUrls={preview?.imageUrls ?? []}
                photoCount={googlePlace?.photoCount}
              />
            ) : null}
            {phase === "website" ? (
              <AuditScanningWebsitePreview websiteUrl={website} imageUrl={previewImageUrl} />
            ) : null}
            {phase === "mobile" ? (
              <div className="flex justify-center">
                <AuditScanningMobileLaser imageUrl={previewImageUrl} />
              </div>
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
              className="mx-auto mt-4 block text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              {skipLabel}
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
