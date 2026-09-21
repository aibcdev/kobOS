import type { Restaurant } from "@/lib/kob/demo-data";
import type { AutonomyRule, Finding, MemoryItem, Review } from "@/lib/kob/demo-data";
import type { ToolId } from "@/lib/kob/integrations";
import type { HouseRules } from "@/lib/kob/house-rules";
import type { DataSource } from "./types";

export type RestaurantContext = {
  restaurant: Restaurant
  integrations: Record<ToolId, boolean>
  permissions: AutonomyRule[]
  rules: HouseRules
  memory: MemoryItem[]
  findings: Finding[]
  reviews: Review[]
  dataFreshness: DataSource[]
};

export function buildRestaurantContext(input: {
  restaurant: Restaurant
  connected: Record<ToolId, boolean>
  autonomy: AutonomyRule[]
  houseRules: HouseRules
  memory: MemoryItem[]
  findings: Finding[]
  reviews: Review[]
}): RestaurantContext {
  const now = new Date().toISOString();
  const freshness: DataSource[] = [
    {
      id: "google",
      kind: input.connected.google ? "store" : "none",
      label: "Google listing (public watch)",
      freshAt: now,
      status: input.connected.google ? "DEMO" : "DISCONNECTED",
    },
    {
      id: "website",
      kind: input.connected.website ? "store" : "none",
      label: "Website",
      status: input.connected.website ? "DEMO" : "DISCONNECTED",
    },
    {
      id: "accounting",
      kind: input.connected.accounting ? "demo" : "none",
      label: "Invoices",
      status: input.connected.accounting ? "DEMO" : "DISCONNECTED",
    },
    {
      id: "pos",
      kind: "none",
      label: "POS / till",
      status: "DISCONNECTED",
    },
    {
      id: "bookings",
      kind: "none",
      label: "Reservations",
      status: "DISCONNECTED",
    },
    {
      id: "waste",
      kind: "none",
      label: "Waste Eye",
      status: "DISCONNECTED",
    },
  ];

  return {
    restaurant: input.restaurant,
    integrations: input.connected,
    permissions: input.autonomy,
    rules: input.houseRules,
    memory: input.memory,
    findings: input.findings,
    reviews: input.reviews,
    dataFreshness: freshness,
  };
}

export function sourceById(ctx: RestaurantContext, id: string): DataSource | undefined {
  return ctx.dataFreshness.find((s) => s.id === id);
}
