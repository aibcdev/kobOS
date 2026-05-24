import type { AuditResultPayload } from "@/lib/audit/types";

/** True when headline scores are safe to show (not the pending placeholder). */
export function isAuditScoresReady(payload: Pick<AuditResultPayload, "scoresPending" | "scanStatus">): boolean {
  if (payload.scoresPending) return false;
  return payload.scanStatus === "ready" || payload.scanStatus === "failed";
}
