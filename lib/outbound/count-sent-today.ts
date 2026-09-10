import { prisma } from "@/lib/db/prisma";
import { utcDayBounds } from "@/lib/outbound/send-volume";

/** Count provider-accepted sends for the UTC day from durable delivery records. */
export async function countOutboundSentUtcDay(workspaceId: string): Promise<number> {
  const { start, end } = utcDayBounds();
  return prisma.outboundDelivery.count({
    where: {
      sentAt: { gte: start, lt: end },
      outboundLead: { workspaceRestaurantId: workspaceId },
    },
  });
}
