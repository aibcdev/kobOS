"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditPerceptionTeaser } from "@/lib/marketing/audit-scan-preview";
import type {
  AuditResultPayload,
  BenchmarkV1MediaResult,
  BenchmarkV1Result,
  PerceptionAuditV1,
  RestaurantScoresV1,
} from "@/lib/audit/types";

export type AuditBenchmarkPollSnapshot = {
  scoresPending?: boolean;
  benchmarkV1Status?: AuditResultPayload["benchmarkV1Status"];
  benchmarkV1: BenchmarkV1Result | null;
  benchmarkV1Error?: string;
  benchmarkV1MediaStatus?: AuditResultPayload["benchmarkV1MediaStatus"];
  benchmarkV1Media: BenchmarkV1MediaResult | null;
  benchmarkV1MediaError?: string;
  perceptionAuditV1Status?: AuditResultPayload["perceptionAuditV1Status"];
  perceptionAuditV1: PerceptionAuditV1 | null;
  perceptionAuditV1Error?: string;
  perceptionTeaser?: AuditPerceptionTeaser;
  scanStatus?: AuditResultPayload["scanStatus"];
  browserbaseScan?: AuditResultPayload["browserbaseScan"] | null;
  evidencePack?: Pick<AuditEvidencePackV1, "imageCandidates" | "mediaAssetsMeta"> | null;
  scores: AuditResultPayload["scores"];
  overallScore: number;
  seoScore: number;
  designScore: number;
  mobileScore: number;
  conversionScore: number;
  restaurantScores?: RestaurantScoresV1 | null;
};

const MAX_POLL_MS = 5 * 60_000;
const INITIAL_INTERVAL_MS = 2_000;
const MAX_INTERVAL_MS = 4_000;

function isPending(data: AuditBenchmarkPollSnapshot, unlocked: boolean) {
  const pendingText = data.benchmarkV1Status === "pending";
  const pendingMedia = data.benchmarkV1MediaStatus === "pending";
  const pendingPerception = data.perceptionAuditV1Status === "pending";
  const pendingScan = data.scanStatus === "pending";
  return unlocked
    ? pendingText || pendingMedia || pendingPerception || pendingScan
    : pendingPerception;
}

export function useAuditBenchmarkPoll(
  auditId: string,
  initial: AuditBenchmarkPollSnapshot,
  options?: { unlocked?: boolean },
) {
  const unlocked = options?.unlocked ?? true;
  const [data, setData] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const startedAt = useRef(Date.now());

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/audit/${auditId}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as AuditBenchmarkPollSnapshot;
    setData(json);
    return json;
  }, [auditId]);

  const retryAnalysis = useCallback(async () => {
    setRetrying(true);
    setTimedOut(false);
    startedAt.current = Date.now();
    try {
      await fetch(`/api/audit/${auditId}/retry-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full: true }),
      });
      await refresh();
    } finally {
      setRetrying(false);
    }
  }, [auditId, refresh]);

  useEffect(() => {
    if (!isPending(data, unlocked)) {
      setTimedOut(false);
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let intervalMs = INITIAL_INTERVAL_MS;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt.current >= MAX_POLL_MS) {
        setTimedOut(true);
        return;
      }
      await refresh();
      if (cancelled) return;
      intervalMs = Math.min(MAX_INTERVAL_MS, intervalMs + 500);
      timeoutId = window.setTimeout(() => {
        void tick();
      }, intervalMs);
    };

    timeoutId = window.setTimeout(() => {
      void tick();
    }, INITIAL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    auditId,
    data.benchmarkV1MediaStatus,
    data.benchmarkV1Status,
    data.perceptionAuditV1Status,
    data.scanStatus,
    refresh,
    unlocked,
  ]);

  const stillPending = isPending(data, unlocked);

  return { data, refresh, stillPending, timedOut, retrying, retryAnalysis };
}
