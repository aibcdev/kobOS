/**
 * Canonical offer shape shared by Demand Engine (restaurant) and future consumer app.
 */
export type StructuredOfferDiscountType = "percent" | "amount" | "bogo" | "fixed_menu";

export type StructuredOffer = {
  headline: string;
  description: string;
  discountType: StructuredOfferDiscountType;
  discountValue?: number;
  discountLabel?: string;
  cuisineTags?: string[];
  daypart?: string;
  conditions?: string;
  /** ISO timestamps */
  validFrom: string;
  validTo: string;
  templateKey?: string;
};

export function discountLabelFromOffer(offer: StructuredOffer): string {
  if (offer.discountLabel?.trim()) return offer.discountLabel.trim();
  if (offer.discountType === "percent" && offer.discountValue != null) {
    return `${offer.discountValue}% off`;
  }
  if (offer.discountType === "amount" && offer.discountValue != null) {
    return `£${offer.discountValue} off`;
  }
  if (offer.discountType === "bogo") return "Buy 1 get 1";
  return offer.headline.slice(0, 40);
}

export function parseStructuredOffer(raw: unknown): StructuredOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.headline !== "string" || typeof o.description !== "string") return null;
  if (typeof o.validFrom !== "string" || typeof o.validTo !== "string") return null;
  const discountType = o.discountType;
  if (
    discountType !== "percent" &&
    discountType !== "amount" &&
    discountType !== "bogo" &&
    discountType !== "fixed_menu"
  ) {
    return null;
  }
  return {
    headline: o.headline,
    description: o.description,
    discountType,
    discountValue: typeof o.discountValue === "number" ? o.discountValue : undefined,
    discountLabel: typeof o.discountLabel === "string" ? o.discountLabel : undefined,
    cuisineTags: Array.isArray(o.cuisineTags)
      ? o.cuisineTags.filter((t): t is string => typeof t === "string")
      : undefined,
    daypart: typeof o.daypart === "string" ? o.daypart : undefined,
    conditions: typeof o.conditions === "string" ? o.conditions : undefined,
    validFrom: o.validFrom,
    validTo: o.validTo,
    templateKey: typeof o.templateKey === "string" ? o.templateKey : undefined,
  };
}
