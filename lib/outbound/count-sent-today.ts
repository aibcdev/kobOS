import { prisma } from "@/lib/db/prisma";
import { utcDayBounds } from "@/lib/outbound/send-volume";

/** SENT leads updated today (UTC) plus sequences with emailSentAt today. */
export async function countOutboundSentUtcDay(workspaceId: string): Promise<number> {
  const { start, end } = utcDayBounds();
  const [leads, sequences] = await Promise.all([
    prisma.outboundLead.count({
      where: {
        workspaceRestaurantId: workspaceId,
        status: "SENT",
        updatedAt: { gte: start, lt: end },
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
