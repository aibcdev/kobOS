import { prisma } from "@/lib/db/prisma";
import { utcDayBounds } from "@/lib/outbound/send-volume";

/** Count sends for the UTC day. OutboundLead has no updatedAt — use insight stamp + sequences. */
export async function countOutboundSentUtcDay(workspaceId: string): Promise<number> {
  const { start, end } = utcDayBounds();
  const day = start.toISOString().slice(0, 10);
  const [leads, sequences] = await Promise.all([
    prisma.outboundLead.count({
      where: {
        workspaceRestaurantId: workspaceId,
        status: "SENT",
        insightSummary: { contains: day },
      },
    }),
    prisma.outboundSequence.count({
      where: {
        workspaceRestaurantId: workspaceId,
        emailSentAt: { gte: start, lt: end },
      },
    }),
  ]);
  return Math.max(leads, sequences);
}
