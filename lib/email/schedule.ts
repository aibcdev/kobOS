import { utcToZoned } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";

/** The morning run happens at 07:00 local; with a 15-minute tick and a 15-minute window, exactly once a day. */
export const MORNING_LOCAL_TIME = "07:00";
const WINDOW_MINUTES = 15;

export function morningDue(now: Date, timeZone: string, at = MORNING_LOCAL_TIME): boolean {
  const local = utcToZoned(now, timeZone);
  const minutes = Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
  const [h, m] = at.split(":").map(Number);
  return minutes >= h * 60 + m && minutes < h * 60 + m + WINDOW_MINUTES;
}

/** Monday in the restaurant's own week. */
export function isLocalMonday(now: Date, timeZone: string): boolean {
  return new Date(`${utcToZoned(now, timeZone).slice(0, 10)}T00:00:00Z`).getUTCDay() === 1;
}

/** Restaurants KOB works for each morning: an owner, and a trial or plan that's running. */
export async function morningCandidates(): Promise<{ id: string; timezone: string }[]> {
  return prisma.restaurant.findMany({
    where: { billingStatus: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] }, members: { some: { role: "OWNER" } } },
    select: { id: true, timezone: true },
  });
}
