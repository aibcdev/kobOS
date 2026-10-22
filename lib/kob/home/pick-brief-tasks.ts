import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";

export const HOME_BRIEF_LIMIT = 3;

/** Approve-able now: no missing connection, still pending. Audit fixes first, then confidence. */
export function pickBriefTasks(tasks: ChiefOfStaffTaskDto[], limit = HOME_BRIEF_LIMIT): ChiefOfStaffTaskDto[] {
  return tasks
    .filter((t) => t.status === "PENDING" && !t.requiresIntegration)
    .sort((a, b) => {
      const audit = Number(b.source === "AUDIT") - Number(a.source === "AUDIT");
      return audit !== 0 ? audit : b.confidenceScore - a.confidenceScore;
    })
    .slice(0, limit);
}

/** Impact chips must not carry money figures (no invented ROI on the home screen). */
export function displayImpact(label: string | null): string | null {
  if (!label || /[£$€]/.test(label)) return null;
  return label;
}
