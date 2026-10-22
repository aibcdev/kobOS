import type { GuestInput } from "@/lib/commerce/guests";
import type { CatalogItemInput, OrderInput } from "@/lib/commerce/ingest";
import { toMinor } from "@/lib/commerce/money";
import { zonedToUtc } from "@/lib/connectors/shared";

export type EposTransaction = {
  Id: number;
  CustomerId?: number | null;
  /** Wall-clock time at the till, no offset. */
  DateTime?: string;
  TotalAmount?: number;
  TaxAmount?: number | null;
  ServiceCharge?: number | null;
  Gratuity?: number | null;
  DiscountValue?: number | null;
  TransactionItems?: { Id?: number; ProductId?: number | null; Quantity?: number; UnitPrice?: number; DiscountAmount?: number | null }[];
};

export type EposProduct = { Id: number; Name?: string; SalePrice?: number | null; CategoryId?: number | null; IsArchived?: boolean };
export type EposCategory = { Id: number; Name?: string };
export type EposCustomer = { Id: number; Forename?: string; Surname?: string; EmailAddress?: string | null; ContactNumber?: string | null };

/**
 * Epos Now records a refund as its own transaction with a negative total; it becomes a REFUNDED row with total 0 so it
 * reduces revenue without counting as an order.
 */
export function mapEposTransaction(t: EposTransaction, ctx: { timezone: string; currency: string; productNames: Map<string, string> }): OrderInput | null {
  if (!t.DateTime) return null;
  const m = (n: number | null | undefined) => toMinor(n ?? 0, ctx.currency);
  const total = m(t.TotalAmount);
  const refund = total < 0;
  const tip = m(t.Gratuity);
  const tax = m(t.TaxAmount);
  const service = m(t.ServiceCharge);
  return {
    source: { kind: "API", provider: "EPOS_NOW", externalId: String(t.Id) },
    status: refund ? "REFUNDED" : "COMPLETED",
    channel: "UNKNOWN",
    placedAt: zonedToUtc(t.DateTime, ctx.timezone),
    closedAt: zonedToUtc(t.DateTime, ctx.timezone),
    currency: ctx.currency,
    subtotalMinor: refund ? 0 : total - tax - tip - service,
    discountMinor: m(t.DiscountValue),
    taxMinor: refund ? 0 : tax,
    tipMinor: refund ? 0 : tip,
    serviceChargeMinor: refund ? 0 : service,
    totalMinor: refund ? 0 : total,
    refundedMinor: refund ? -total : 0,
    guest: t.CustomerId ? { identities: [{ kind: "PROVIDER_CUSTOMER", provider: "EPOS_NOW", value: String(t.CustomerId) }] } : null,
    lines: (t.TransactionItems ?? []).map((i) => {
      const quantity = i.Quantity ?? 1;
      const unit = m(i.UnitPrice);
      const productId = i.ProductId != null ? String(i.ProductId) : null;
      return {
        externalId: i.Id != null ? String(i.Id) : null,
        catalogExternalId: productId,
        name: (productId && ctx.productNames.get(productId)) || "Item",
        quantity,
        unitPriceMinor: unit,
        totalMinor: Math.round(unit * quantity) - m(i.DiscountAmount),
      };
    }),
  };
}

export function mapEposProducts(products: EposProduct[], categories: Map<number, string>, currency: string): CatalogItemInput[] {
  return products.map((p) => ({
    externalId: String(p.Id),
    name: p.Name?.trim() || "Item",
    category: p.CategoryId != null ? (categories.get(p.CategoryId) ?? null) : null,
    priceMinor: p.SalePrice == null ? null : toMinor(p.SalePrice, currency),
    currency,
    active: !p.IsArchived,
  }));
}

export function mapEposCustomer(c: EposCustomer): GuestInput {
  const name = [c.Forename, c.Surname].filter(Boolean).join(" ").trim();
  return {
    displayName: name || null,
    identities: [
      { kind: "PROVIDER_CUSTOMER", provider: "EPOS_NOW", value: String(c.Id) },
      ...(c.EmailAddress ? [{ kind: "EMAIL" as const, provider: "EPOS_NOW", value: c.EmailAddress }] : []),
      ...(c.ContactNumber ? [{ kind: "PHONE" as const, provider: "EPOS_NOW", value: c.ContactNumber }] : []),
    ],
  };
}
