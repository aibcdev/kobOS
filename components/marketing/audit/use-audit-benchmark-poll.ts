"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload, BenchmarkV1MediaResult, BenchmarkV1Result } from "@/lib/audit/types";

export type AuditBenchmarkPollSnapshot = {
  scoresPending?: boolean;
  benchmarkV1Status?: AuditResultPayload["benchmarkV1Status"];
  benchmarkV1: BenchmarkV1Result | null;
  benchmarkV1Error?: string;
  benchmarkV1MediaStatus?: AuditResultPayload["benchmarkV1MediaStatus"];
  benchmarkV1Media: BenchmarkV1MediaResult | null;
  benchmarkV1MediaError?: string;
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

export function useAuditBenchmarkPoll(
  auditId: string,
  initial: AuditBenchmarkPollSnapshot,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch(`/api/audit/${auditId}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as AuditBenchmarkPollSnapshot;
    setData(json);
  }, [auditId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const pendingText = data.benchmarkV1Status === "pending";
    const pendingMedia = data.benchmarkV1MediaStatus === "pending";
    const pendingScan = data.scanStatus === "pending";
    if (!pendingText && !pendingMedia && !pendingScan) return;

    const id = window.setInterval(() => {
      void refresh();
    }, 2500);

    const stop = window.setTimeout(() => window.clearInterval(id), 120_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [auditId, data.benchmarkV1MediaStatus, data.benchmarkV1Status, data.scanStatus, refresh, enabled]);

  return { data, refresh };
}
