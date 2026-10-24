import { ownerFacingStatus } from "@/lib/os/gates";

export type TimelineEvent = { id: string; kind: string; createdAt: string; payload: Record<string, unknown> };

/** Owner wording for each audit event. Terminal results reuse `ownerFacingStatus()`. */
export function timelineLabel(e: TimelineEvent): string {
  switch (e.kind) {
    case "action.proposed":
      return "KOB suggested this";
    case "policy.decided":
      return "Checked your permissions";
    case "action.approved":
      return e.payload.by === "policy" ? "Approved by your standing permission" : "You approved it";
    case "grant.created":
      return "Saved your permission";
    case "action.rejected":
      return `Skipped${typeof e.payload.reason === "string" ? `: ${e.payload.reason}` : ""}`;
    case "action.executing":
      return "Working on it";
    case "action.executed":
      return "Sent";
    case "action.verifying":
      return "Checking it stuck";
    case "action.verified":
      return ownerFacingStatus("VERIFIED");
    case "action.failed":
      return ownerFacingStatus("FAILED", typeof e.payload.code === "string" ? e.payload.code : null);
    case "action.rolled_back":
      return ownerFacingStatus("ROLLED_BACK");
    default:
      return e.kind;
  }
}

export function ActionTimeline({ events, timezone }: { events: TimelineEvent[]; timezone: string }) {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
  return (
    <ol className="space-y-3 border-l border-line pl-4">
      {events.map((e) => (
        <li key={e.id} className="text-sm">
          <p>{timelineLabel(e)}</p>
          <p className="text-xs text-muted">{fmt.format(new Date(e.createdAt))}</p>
        </li>
      ))}
    </ol>
  );
}
