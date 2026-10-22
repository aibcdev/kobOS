import { prisma } from "@/lib/db/prisma";
import { reliabilityScore } from "@/lib/os/reliability";

/** Recent outcomes considered per workflow. */
const WINDOW = 50;

/**
 * Recompute `OsWorkflowReliability` for (restaurant, actionType) from its recent terminal actions
 * (docs/KOB-OPERATING-SYSTEM.md six factors). D and C have no signal yet and count as 1; F treats a reject
 * as owner disagreement until edit tracking lands.
 */
export async function recomputeReliability(restaurantId: string, actionType: string): Promise<void> {
  const recent = await prisma.osAction.findMany({
    where: { restaurantId, actionType, status: { in: ["VERIFIED", "FAILED", "REJECTED", "ROLLED_BACK"] } },
    orderBy: { updatedAt: "desc" },
    take: WINDOW,
    select: { status: true, failureCode: true },
  });
  const count = (pred: (s: (typeof recent)[number]) => boolean) => recent.filter(pred).length;
  const verified = count((a) => a.status === "VERIFIED");
  const rolledBack = count((a) => a.status === "ROLLED_BACK");
  const rejected = count((a) => a.status === "REJECTED");
  const ran = count((a) => a.status !== "REJECTED" && !a.failureCode?.startsWith("DENIED_") && a.failureCode !== "EXPIRED");
  const verifyFailures = count((a) => a.status === "FAILED" && !!a.failureCode?.startsWith("VERIFY_"));
  const executeFailures = count((a) => a.status === "FAILED" && !a.failureCode?.startsWith("VERIFY_") && !a.failureCode?.startsWith("DENIED_") && a.failureCode !== "EXPIRED");

  const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);
  const parts = {
    d: 1,
    e: ratio(ran - executeFailures, ran),
    v: ratio(verified + rolledBack, verified + rolledBack + verifyFailures),
    c: 1,
    f: ratio(ran, ran + rejected),
    u: verified + rolledBack > 0 ? 1 - rolledBack / (verified + rolledBack) : 0,
  };
  const score = reliabilityScore(parts);
  await prisma.osWorkflowReliability.upsert({
    where: { restaurantId_workflowId: { restaurantId, workflowId: actionType } },
    create: { restaurantId, workflowId: actionType, ...parts, score, sampleN: verified },
    update: { ...parts, score, sampleN: verified },
  });
}
