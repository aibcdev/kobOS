"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditPerceptionTeaser } from "@/lib/marketing/audit-scan-preview";
import type { AuditResultPayload, BenchmarkV1MediaResult, BenchmarkV1Result, PerceptionAuditV1 } from "@/lib/audit/types";

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
};

const TEASER_POLL_MS = 120_000;

export function useAuditBenchmarkPoll(
  auditId: string,
  initial: AuditBenchmarkPollSnapshot,
  options?: { unlocked?: boolean },
) {
  const unlocked = options?.unlocked ?? true;
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/audit/${auditId}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as AuditBenchmarkPollSnapshot;
    setData(json);
  }, [auditId]);

  useEffect(() => {
    const pendingText = data.benchmarkV1Status === "pending";
    const pendingMedia = data.benchmarkV1MediaStatus === "pending";
    const pendingPerception = data.perceptionAuditV1Status === "pending";
    const pendingScan = data.scanStatus === "pending";

    const shouldPoll = unlocked
      ? pendingText || pendingMedia || pendingPerception || pendingScan
      : pendingPerception;

    if (!shouldPoll) return;

    const id = window.setInterval(() => {
      void refresh();
    }, 2500);

    const cap = unlocked ? 120_000 : TEASER_POLL_MS;
    const stop = window.setTimeout(() => window.clearInterval(id), cap);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
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

  return { data, refresh };
}
