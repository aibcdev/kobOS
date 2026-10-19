/**
 * What a restaurant's subscription unlocks. Spec 2 §16.2: one core plan (£79 / $99 per location) plus add-ons.
 * No add-on is on sale yet, so everyone gets core only; when one ships, list it in `ADDONS_ON_SALE` and map its
 * Stripe subscription item in `entitlementsFor` (T-200). Read by lib/hub/capabilities.ts.
 */
export const ADDONS = ["PHONE_HOST", "DIRECT_ORDERING", "GROWTH", "TEAM"] as const;
export type Addon = (typeof ADDONS)[number];

export type Entitlements = { core: true; addons: Record<Addon, boolean> };

/** Add-ons that can currently be bought. Empty until the first add-on launches. */
export const ADDONS_ON_SALE: readonly Addon[] = [];

export function coreEntitlements(): Entitlements {
  return { core: true, addons: { PHONE_HOST: false, DIRECT_ORDERING: false, GROWTH: false, TEAM: false } };
}

/** `subscriptionItems` are the restaurant's active Stripe add-on keys; ignored until an add-on is on sale. */
export function entitlementsFor(subscriptionItems: readonly string[] = []): Entitlements {
  const e = coreEntitlements();
  for (const addon of ADDONS_ON_SALE) if (subscriptionItems.includes(addon)) e.addons[addon] = true;
  return e;
}

export function hasAddon(e: Entitlements, addon: Addon | null | undefined): boolean {
  return !addon || e.addons[addon];
}
