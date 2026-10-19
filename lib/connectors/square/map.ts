import type { GuestInput } from "@/lib/commerce/guests";
import type { CatalogItemInput, OrderChannel, OrderInput } from "@/lib/commerce/ingest";

type Money = { amount?: number | null; currency?: string | null } | null | undefined;

export type SquareOrder = {
  id: string;
  location_id?: string;
  state?: "OPEN" | "COMPLETED" | "CANCELED" | "DRAFT";
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  customer_id?: string | null;
  source?: { name?: string } | null;
  fulfillments?: { type?: string }[];
  line_items?: {
    uid?: string;
    name?: string;
    variation_name?: string;
    quantity?: string;
    catalog_object_id?: string;
    base_price_money?: Money;
    total_money?: Money;
    modifiers?: { name?: string; base_price_money?: Money }[];
  }[];
  refunds?: { status?: string; amount_money?: Money }[];
  total_money?: Money;
  total_tax_money?: Money;
  total_discount_money?: Money;
  total_tip_money?: Money;
  total_service_charge_money?: Money;
};

export type SquareCatalogObject = {
  id: string;
  type: string;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  category_data?: { name?: string };
  item_data?: {
    name?: string;
    category_id?: string;
    categories?: { id: string }[];
    variations?: { id: string; is_deleted?: boolean; item_variation_data?: { name?: string; price_money?: Money } }[];
  };
};

export type SquareCustomer = {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  updated_at?: string;
};

const amt = (m: Money) => m?.amount ?? 0;

function channelOf(o: SquareOrder): OrderChannel {
  const types = (o.fulfillments ?? []).map((f) => f.type);
  if (types.includes("DELIVERY")) return "DELIVERY";
  if (types.includes("PICKUP")) return "TAKEAWAY";
  if (types.includes("SHIPMENT") || types.includes("DIGITAL")) return "ONLINE";
  return "UNKNOWN";
}

function lineName(name?: string, variation?: string): string {
  const base = name?.trim() || "Item";
  return variation && variation !== "Regular" && variation !== base ? `${base} (${variation})` : base;
}

/** Square sends money in minor units already. DRAFT orders are not orders yet (null). */
export function mapSquareOrder(o: SquareOrder): OrderInput | null {
  if (o.state === "DRAFT" || !o.created_at) return null;
  const currency = o.total_money?.currency ?? o.line_items?.[0]?.total_money?.currency ?? "GBP";
  const total = amt(o.total_money);
  const tax = amt(o.total_tax_money);
  const tip = amt(o.total_tip_money);
  const service = amt(o.total_service_charge_money);
  const discount = amt(o.total_discount_money);
  const refunded = (o.refunds ?? []).filter((r) => r.status === "COMPLETED").reduce((s, r) => s + amt(r.amount_money), 0);
  const status = o.state === "CANCELED" ? "CANCELLED" : o.state === "OPEN" ? "OPEN" : refunded > 0 ? "REFUNDED" : "COMPLETED";
  return {
    source: { kind: "API", provider: "SQUARE", externalId: o.id },
    status,
    channel: channelOf(o),
    placedAt: new Date(o.created_at),
    closedAt: o.closed_at ? new Date(o.closed_at) : null,
    currency,
    subtotalMinor: total - tax - tip - service + discount,
    discountMinor: discount,
    taxMinor: tax,
    tipMinor: tip,
    serviceChargeMinor: service,
    totalMinor: total,
    refundedMinor: refunded,
    externalLocationId: o.location_id ?? null,
    guest: o.customer_id ? { identities: [{ kind: "PROVIDER_CUSTOMER", provider: "SQUARE", value: o.customer_id }] } : null,
    lines: (o.line_items ?? []).map((l) => {
      const quantity = Number(l.quantity ?? "1") || 1;
      return {
        externalId: l.uid ?? null,
        catalogExternalId: l.catalog_object_id ?? null,
        name: lineName(l.name, l.variation_name),
        quantity,
        unitPriceMinor: amt(l.base_price_money),
        totalMinor: l.total_money ? amt(l.total_money) : Math.round(amt(l.base_price_money) * quantity),
        modifiers: (l.modifiers ?? []).map((m) => ({ name: m.name ?? "", priceMinor: amt(m.base_price_money) })),
      };
    }),
  };
}

/** One MenuItemLink per sellable variation (order lines reference the variation id). */
export function mapSquareCatalog(objects: SquareCatalogObject[], categoryNames: Map<string, string>): CatalogItemInput[] {
  const out: CatalogItemInput[] = [];
  for (const o of objects) {
    if (o.type !== "ITEM" || !o.item_data) continue;
    const catId = o.item_data.categories?.[0]?.id ?? o.item_data.category_id;
    for (const v of o.item_data.variations ?? []) {
      out.push({
        externalId: v.id,
        name: lineName(o.item_data.name, v.item_variation_data?.name),
        category: catId ? (categoryNames.get(catId) ?? null) : null,
        priceMinor: v.item_variation_data?.price_money?.amount ?? null,
        currency: v.item_variation_data?.price_money?.currency ?? null,
        active: !o.is_deleted && !v.is_deleted,
      });
    }
  }
  return out;
}

export function mapSquareCustomer(c: SquareCustomer): GuestInput {
  const name = [c.given_name, c.family_name].filter(Boolean).join(" ").trim();
  return {
    displayName: name || null,
    identities: [
      { kind: "PROVIDER_CUSTOMER", provider: "SQUARE", value: c.id },
      ...(c.email_address ? [{ kind: "EMAIL" as const, value: c.email_address, provider: "SQUARE" }] : []),
      ...(c.phone_number ? [{ kind: "PHONE" as const, value: c.phone_number, provider: "SQUARE" }] : []),
    ],
  };
}
