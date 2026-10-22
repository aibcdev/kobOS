import type { GuestIdentityInput } from "@/lib/commerce/guests";
import type { CatalogItemInput, OrderChannel, OrderInput } from "@/lib/commerce/ingest";
import { toMinor } from "@/lib/commerce/money";

export type ToastSelection = {
  guid?: string;
  displayName?: string;
  item?: { guid?: string } | null;
  quantity?: number;
  price?: number;
  preDiscountPrice?: number;
  voided?: boolean;
  modifiers?: { displayName?: string; price?: number }[];
};

export type ToastCheck = {
  guid?: string;
  voided?: boolean;
  deleted?: boolean;
  totalAmount?: number;
  taxAmount?: number;
  customer?: { guid?: string; email?: string; phone?: string; firstName?: string; lastName?: string } | null;
  payments?: { tipAmount?: number; refund?: { refundAmount?: number; tipRefundAmount?: number } | null }[];
  appliedDiscounts?: { discountAmount?: number }[];
  appliedServiceCharges?: { chargeAmount?: number }[];
  selections?: ToastSelection[];
};

export type ToastOrder = {
  guid: string;
  openedDate?: string;
  closedDate?: string | null;
  modifiedDate?: string;
  voided?: boolean;
  deleted?: boolean;
  source?: string;
  checks?: ToastCheck[];
};

const sum = <T>(xs: T[] | undefined, f: (x: T) => number | undefined) => (xs ?? []).reduce((s, x) => s + (f(x) ?? 0), 0);

function channelOf(source?: string): OrderChannel {
  const s = (source ?? "").toLowerCase();
  if (/grubhub|doordash|uber|deliveroo|just ?eat|postmates/.test(s)) return "DELIVERY";
  if (s.includes("online")) return "ONLINE";
  return "UNKNOWN";
}

/** Toast amounts are decimal major units and carry no currency; the restaurant's currency is passed in. */
export function mapToastOrder(o: ToastOrder, currency: string): OrderInput | null {
  if (!o.openedDate) return null;
  const checks = (o.checks ?? []).filter((c) => !c.voided && !c.deleted);
  const m = (n: number) => toMinor(n, currency);
  const payments = checks.flatMap((c) => c.payments ?? []);
  const tip = m(sum(payments, (p) => p.tipAmount));
  const tax = m(sum(checks, (c) => c.taxAmount));
  const totalBeforeTip = m(sum(checks, (c) => c.totalAmount));
  const discount = m(sum(checks.flatMap((c) => c.appliedDiscounts ?? []), (d) => d.discountAmount));
  const service = m(sum(checks.flatMap((c) => c.appliedServiceCharges ?? []), (s) => s.chargeAmount));
  const refunded = m(sum(payments, (p) => (p.refund?.refundAmount ?? 0) + (p.refund?.tipRefundAmount ?? 0)));
  const status = o.voided || o.deleted ? "CANCELLED" : !o.closedDate ? "OPEN" : refunded > 0 ? "REFUNDED" : "COMPLETED";

  const customer = checks.find((c) => c.customer)?.customer;
  const identities: GuestIdentityInput[] = [];
  if (customer?.guid) identities.push({ kind: "PROVIDER_CUSTOMER", provider: "TOAST", value: customer.guid });
  if (customer?.email) identities.push({ kind: "EMAIL", provider: "TOAST", value: customer.email });
  if (customer?.phone) identities.push({ kind: "PHONE", provider: "TOAST", value: customer.phone });
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();

  return {
    source: { kind: "API", provider: "TOAST", externalId: o.guid },
    status,
    channel: channelOf(o.source),
    placedAt: new Date(o.openedDate),
    closedAt: o.closedDate ? new Date(o.closedDate) : null,
    currency,
    subtotalMinor: totalBeforeTip - tax - service,
    discountMinor: discount,
    taxMinor: tax,
    tipMinor: tip,
    serviceChargeMinor: service,
    totalMinor: totalBeforeTip + tip,
    refundedMinor: refunded,
    guest: identities.length ? { displayName: name || null, identities } : null,
    lines: checks
      .flatMap((c) => c.selections ?? [])
      .filter((s) => !s.voided)
      .map((s) => {
        const quantity = s.quantity ?? 1;
        const total = m(s.price ?? 0);
        return {
          externalId: s.guid ?? null,
          catalogExternalId: s.item?.guid ?? null,
          name: s.displayName?.trim() || "Item",
          quantity,
          unitPriceMinor: quantity ? Math.round(m(s.preDiscountPrice ?? s.price ?? 0) / quantity) : 0,
          totalMinor: total,
          modifiers: (s.modifiers ?? []).map((x) => ({ name: x.displayName ?? "", priceMinor: m(x.price ?? 0) })),
        };
      }),
  };
}

export type ToastMenuGroup = { name?: string; menuItems?: { guid: string; name?: string; price?: number | null }[]; menuGroups?: ToastMenuGroup[] };
type Group = ToastMenuGroup;

/** Flattens menus → groups (nested) → items; the first group an item appears in is its category. */
export function mapToastMenus(menus: { menuGroups?: ToastMenuGroup[] }[], currency: string): CatalogItemInput[] {
  const seen = new Map<string, CatalogItemInput>();
  const walk = (groups: Group[] | undefined) => {
    for (const g of groups ?? []) {
      for (const i of g.menuItems ?? []) {
        if (seen.has(i.guid)) continue;
        seen.set(i.guid, {
          externalId: i.guid,
          name: i.name?.trim() || "Item",
          category: g.name ?? null,
          priceMinor: i.price == null ? null : toMinor(i.price, currency),
          currency,
        });
      }
      walk(g.menuGroups);
    }
  };
  for (const menu of menus) walk(menu.menuGroups);
  return [...seen.values()];
}
