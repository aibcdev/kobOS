import type { CatalogItemInput, OrderInput } from "@/lib/commerce/ingest";

export type ZettlePurchase = {
  purchaseUUID1: string;
  timestamp?: string;
  /** Minor units; negative on refund purchases. */
  amount?: number;
  vatAmount?: number;
  currency?: string;
  refund?: boolean;
  gratuityAmount?: number;
  payments?: { gratuityAmount?: number }[];
  discounts?: { amount?: number }[];
  products?: {
    productUuid?: string;
    variantUuid?: string;
    name?: string;
    variantName?: string;
    quantity?: string | number;
    unitPrice?: number;
    discountValue?: number;
  }[];
};

export type ZettleProduct = {
  uuid: string;
  name?: string;
  category?: { name?: string } | null;
  variants?: { uuid: string; name?: string; price?: { amount?: number; currencyId?: string } | null }[];
};

/** Zettle sends minor units. A refund is its own purchase with a negative amount (REFUNDED, total 0). */
export function mapZettlePurchase(p: ZettlePurchase): OrderInput | null {
  if (!p.timestamp) return null;
  const amount = p.amount ?? 0;
  const refund = p.refund === true || amount < 0;
  const tip = p.gratuityAmount ?? (p.payments ?? []).reduce((s, x) => s + (x.gratuityAmount ?? 0), 0);
  const tax = p.vatAmount ?? 0;
  const discount = (p.discounts ?? []).reduce((s, d) => s + Math.abs(d.amount ?? 0), 0);
  return {
    source: { kind: "API", provider: "ZETTLE", externalId: p.purchaseUUID1 },
    status: refund ? "REFUNDED" : "COMPLETED",
    channel: "UNKNOWN",
    placedAt: new Date(p.timestamp),
    closedAt: new Date(p.timestamp),
    currency: p.currency ?? "GBP",
    subtotalMinor: refund ? 0 : amount - tax - tip,
    discountMinor: refund ? 0 : discount,
    taxMinor: refund ? 0 : tax,
    tipMinor: refund ? 0 : tip,
    totalMinor: refund ? 0 : amount,
    refundedMinor: refund ? Math.abs(amount) : 0,
    lines: (p.products ?? []).map((l) => {
      const quantity = Number(l.quantity ?? 1) || 1;
      const unit = l.unitPrice ?? 0;
      const variant = l.variantName && l.variantName !== l.name ? ` (${l.variantName})` : "";
      return {
        catalogExternalId: l.variantUuid ?? l.productUuid ?? null,
        name: `${l.name?.trim() || "Item"}${variant}`,
        quantity,
        unitPriceMinor: unit,
        totalMinor: Math.round(unit * quantity) - (l.discountValue ?? 0),
      };
    }),
  };
}

/** One MenuItemLink per variant, matching how purchases reference products. */
export function mapZettleProducts(products: ZettleProduct[]): CatalogItemInput[] {
  return products.flatMap((p) =>
    (p.variants?.length ? p.variants : [{ uuid: p.uuid, name: undefined, price: null }]).map((v) => ({
      externalId: v.uuid,
      name: `${p.name?.trim() || "Item"}${v.name && v.name !== p.name ? ` (${v.name})` : ""}`,
      category: p.category?.name ?? null,
      priceMinor: v.price?.amount ?? null,
      currency: v.price?.currencyId ?? null,
    })),
  );
}
