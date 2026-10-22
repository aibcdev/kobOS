import type { GuestInput } from "@/lib/commerce/guests";
import type { CatalogItemInput, OrderChannel, OrderInput, OrderStatus } from "@/lib/commerce/ingest";

type Elements<T> = { elements?: T[] } | null | undefined;

export type CloverOrder = {
  id: string;
  currency?: string;
  /** Minor units, tax included, tips excluded. */
  total?: number;
  state?: string | null;
  paymentState?: "OPEN" | "PAID" | "REFUNDED" | "CREDITED" | "PARTIALLY_PAID" | "PARTIALLY_REFUNDED" | null;
  createdTime?: number;
  clientCreatedTime?: number;
  modifiedTime?: number;
  orderType?: { label?: string } | null;
  customers?: Elements<{ id: string }>;
  lineItems?: Elements<{
    id?: string;
    name?: string;
    price?: number;
    /** Thousandths, only on quantity-priced lines (1500 = 1.5). */
    unitQty?: number | null;
    item?: { id?: string } | null;
    refunded?: boolean;
    modifications?: Elements<{ name?: string; amount?: number }>;
  }>;
  payments?: Elements<{ amount?: number; tipAmount?: number; taxAmount?: number; result?: string }>;
  refunds?: Elements<{ amount?: number; taxAmount?: number }>;
};

export type CloverItem = {
  id: string;
  name?: string;
  price?: number;
  priceType?: "FIXED" | "VARIABLE" | "PER_UNIT";
  hidden?: boolean;
  available?: boolean;
  deleted?: boolean;
  categories?: Elements<{ id?: string; name?: string }>;
};

export type CloverCustomer = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses?: Elements<{ emailAddress?: string }>;
  phoneNumbers?: Elements<{ phoneNumber?: string }>;
};

const els = <T>(e: Elements<T>): T[] => e?.elements ?? [];

export function channelOf(label: string | undefined): OrderChannel {
  const l = (label ?? "").toLowerCase();
  if (/deliver/.test(l)) return "DELIVERY";
  if (/take ?away|to ?go|pick ?up|collection/.test(l)) return "TAKEAWAY";
  if (/dine|eat ?in|for here|table/.test(l)) return "DINE_IN";
  if (/online|web/.test(l)) return "ONLINE";
  return "UNKNOWN";
}

function statusOf(o: CloverOrder, refunded: number): OrderStatus {
  switch (o.paymentState) {
    case "PAID":
    case "PARTIALLY_REFUNDED":
      return refunded > 0 ? "REFUNDED" : "COMPLETED";
    case "REFUNDED":
    case "CREDITED":
      return "REFUNDED";
    default:
      return "OPEN";
  }
}

/** Clover money is in minor units. `currency` fills in for orders that omit it (the merchant's currency). */
export function mapCloverOrder(o: CloverOrder, fallbackCurrency: string): OrderInput | null {
  const created = o.createdTime ?? o.clientCreatedTime;
  if (!created) return null;
  const payments = els(o.payments).filter((p) => !p.result || p.result === "SUCCESS");
  const tip = payments.reduce((s, p) => s + (p.tipAmount ?? 0), 0);
  const tax = payments.reduce((s, p) => s + (p.taxAmount ?? 0), 0);
  const refunded = els(o.refunds).reduce((s, r) => s + (r.amount ?? 0), 0);
  const fullyRefunded = o.paymentState === "REFUNDED" || o.paymentState === "CREDITED";
  const total = (o.total ?? 0) + tip;
  const status = statusOf(o, refunded);
  return {
    source: { kind: "API", provider: "CLOVER", externalId: o.id },
    status,
    channel: channelOf(o.orderType?.label),
    placedAt: new Date(created),
    closedAt: status === "OPEN" || !o.modifiedTime ? null : new Date(o.modifiedTime),
    currency: (o.currency ?? fallbackCurrency).toUpperCase(),
    subtotalMinor: (o.total ?? 0) - tax,
    taxMinor: tax,
    tipMinor: tip,
    totalMinor: total,
    refundedMinor: fullyRefunded && refunded === 0 ? total : Math.min(refunded, total),
    guest: els(o.customers)[0]?.id ? { identities: [{ kind: "PROVIDER_CUSTOMER", provider: "CLOVER", value: els(o.customers)[0].id }] } : null,
    lines: els(o.lineItems).map((l) => {
      const quantity = l.unitQty ? l.unitQty / 1000 : 1;
      const mods = els(l.modifications);
      const unit = l.price ?? 0;
      return {
        externalId: l.id ?? null,
        catalogExternalId: l.item?.id ?? null,
        name: l.name?.trim() || "Item",
        quantity,
        unitPriceMinor: unit,
        totalMinor: Math.round(unit * quantity) + mods.reduce((s, m) => s + (m.amount ?? 0), 0),
        modifiers: mods.map((m) => ({ name: m.name ?? "", priceMinor: m.amount ?? 0 })),
      };
    }),
  };
}

export function mapCloverItems(items: CloverItem[], currency: string): CatalogItemInput[] {
  return items.map((i) => ({
    externalId: i.id,
    name: i.name?.trim() || "Item",
    category: els(i.categories)[0]?.name ?? null,
    priceMinor: i.priceType === "VARIABLE" ? null : (i.price ?? null),
    currency,
    active: !i.deleted && !i.hidden && i.available !== false,
  }));
}

export function mapCloverCustomer(c: CloverCustomer): GuestInput {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  const email = els(c.emailAddresses).find((e) => e.emailAddress)?.emailAddress;
  const phone = els(c.phoneNumbers).find((p) => p.phoneNumber)?.phoneNumber;
  return {
    displayName: name || null,
    identities: [
      { kind: "PROVIDER_CUSTOMER", provider: "CLOVER", value: c.id },
      ...(email ? [{ kind: "EMAIL" as const, value: email, provider: "CLOVER" }] : []),
      ...(phone ? [{ kind: "PHONE" as const, value: phone, provider: "CLOVER" }] : []),
    ],
  };
}
