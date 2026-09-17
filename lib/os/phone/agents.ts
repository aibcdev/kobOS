export const GUEST_TOOLS = [
  "get_restaurant_hours",
  "query_menu",
  "query_allergens",
  "get_item_availability",
  "check_reservation",
  "create_reservation",
  "modify_reservation",
  "create_takeaway_order",
  "get_order_status",
  "send_sms",
  "transfer_to_staff",
] as const;

export const OWNER_ONLY_TOOLS = [
  "update_google_hours",
  "read_invoice",
  "adjust_prep",
  "supplier_substitution",
  "waste_event",
] as const;

export type AgentKind = "owner" | "guest";

export function toolAllowed(agent: AgentKind, tool: string): boolean {
  if (agent === "guest") return (GUEST_TOOLS as readonly string[]).includes(tool);
  return true;
}

export function escalateInsteadOfAnswer(utterance: string): boolean {
  const t = utterance.toLowerCase();
  return (
    /ill after|food poison|became ill|lawyer|press|journalist|job application|cv\b|recruit|private hire|wedding for \d{2,}|severe allerg/.test(
      t,
    ) || /complaint/.test(t) && /serious|manager|sick/.test(t)
  );
}

export type AllergenRecord = { confidence: "VERIFIED" | "UNVERIFIED"; text?: string };

export function allergenAnswer(record: AllergenRecord | null): { ok: boolean; reply: string } {
  if (!record || record.confidence !== "VERIFIED") {
    return { ok: false, reply: "I need to put you through to the team for allergens." };
  }
  return { ok: true, reply: record.text ?? "" };
}
