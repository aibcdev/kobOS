import {
  allergenAnswer,
  escalateInsteadOfAnswer,
  toolAllowed,
  type AgentKind,
} from "@/lib/os/phone/agents";

type Json = Record<string, unknown>;

const CONNECTING =
  "Connecting — not verified on a live booking or till adapter. Status is not Done.";

export async function runGuestTool(
  name: string,
  args: Json,
  brain: RestaurantBrainStub,
): Promise<{ ok: boolean; data?: Json; reason?: string }> {
  if (!toolAllowed("guest", name)) {
    return { ok: false, reason: "Guest agent cannot use that tool." };
  }
  switch (name) {
    case "get_restaurant_hours":
      return { ok: true, data: { hours: brain.hours, source: brain.hoursSource } };
    case "query_menu":
      return { ok: true, data: { items: brain.menu } };
    case "query_allergens": {
      const item = String(args.item ?? "");
      const rec = brain.allergens[item] ?? null;
      const a = allergenAnswer(rec);
      if (!a.ok) return { ok: false, reason: a.reply };
      return { ok: true, data: { answer: a.reply } };
    }
    case "get_item_availability":
      return { ok: true, data: { item: args.item, available: brain.available(String(args.item ?? "")) } };
    case "check_reservation":
    case "create_reservation":
    case "modify_reservation":
    case "create_takeaway_order":
    case "get_order_status":
      return { ok: false, reason: CONNECTING };
    case "send_sms":
      return { ok: false, reason: "SMS checkout is Coming soon. Do not take card details on the call." };
    case "transfer_to_staff":
      return { ok: true, data: { transferred: true } };
    default:
      return { ok: false, reason: "Unknown tool" };
  }
}

export type RestaurantBrainStub = {
  hours: string;
  hoursSource: string;
  menu: { name: string; available: boolean }[];
  allergens: Record<string, { confidence: "VERIFIED" | "UNVERIFIED"; text?: string }>;
  available: (item: string) => boolean;
};

export function demoBrain(): RestaurantBrainStub {
  return {
    hours: "Tue–Sun 12pm–10pm · Closed Mon",
    hoursSource: "website",
    menu: [
      { name: "Chicken burger", available: true },
      { name: "Lamb", available: false },
    ],
    allergens: {
      pesto: { confidence: "UNVERIFIED" },
    },
    available: (item) => item.toLowerCase() !== "lamb",
  };
}

export function guestShouldEscalate(text: string): boolean {
  return escalateInsteadOfAnswer(text);
}

export const OWNER_AGENT: AgentKind = "owner";
export const GUEST_AGENT: AgentKind = "guest";
