export type PostCallRecord = {
  intent: "reservation" | "question" | "takeaway" | "escalation" | "other";
  outcome: "booked" | "ordered" | "answered" | "transferred" | "missed" | "failed";
  party_size?: number;
  requested_time?: string;
  actual_time?: string;
  questions: string[];
  complaints: string[];
  lost_revenue_reason: string | null;
  handled_by: "human" | "guest_kob";
};

export function ownerBriefFromCalls(calls: PostCallRecord[]): string {
  if (calls.length === 0) {
    return "No calls in this period yet. Phone answering is Coming soon on the live line.";
  }
  const handled = calls.filter((c) => c.handled_by === "guest_kob").length;
  const booked = calls.filter((c) => c.outcome === "booked").length;
  const takeaway = calls.filter((c) => c.outcome === "ordered").length;
  return `${calls.length} calls. KOB handled ${handled}. ${booked} reservations. ${takeaway} takeaway.`;
}
