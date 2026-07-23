import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import type { IcpRestaurantInput } from "@/lib/outbound/score-icp";

const COMPETITIVE_CITIES = new Set(
  [
    "london",
    "manchester",
    "birmingham",
    "leeds",
    "bristol",
    "glasgow",
    "edinburgh",
    "dublin",
    "liverpool",
    "brighton",
    "oxford",
    "cambridge",
    "bath",
    "york",
    "cardiff",
    "belfast",
  ].map((c) => c.toLowerCase()),
);

const HOTEL_NAME = /\b(hotel|resort|hilton|marriott|hyatt|radisson|ibis|premier inn|travelodge)\b/i;

export type IcpMapSource = {
  placeId?: string | null;
  name: string;
  city?: string | null;
  websiteUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  locationCount?: number | null;
  instagramPostGapDays?: number | null;
  websiteCopyrightYear?: number | null;
  websiteStale?: boolean | null;
  weakWebsite?: boolean | null;
  hasGoogleBusinessPosts?: boolean | null;
  deliveryPlatforms?: string[] | null;
  platformRankPercentile?: number | null;
  /** 0–1 if known */
  reviewResponseRate?: number | null;
  onMajorPlatform?: boolean | null;
  isGhostKitchen?: boolean | null;
  competitorRatingsNearby?: number[] | null;
  websiteNotes?: string | null;
};

/** Map enriched prospect fields → ICP Fit Score input (icp-fit-v1). */
export function mapProspectToIcpInput(source: IcpMapSource): IcpRestaurantInput {
  const websiteUrl = source.websiteUrl?.trim() || null;
  const chain = isLikelyChainRestaurant(source.name, websiteUrl);
  const hotel = HOTEL_NAME.test(source.name);
  const year = source.websiteCopyrightYear;
  const ageYears =
    year != null && year > 1990 ? Math.max(0, new Date().getFullYear() - year) : null;

  const delivery = source.deliveryPlatforms ?? [];
  const onDelivery =
    delivery.some((p) => /deliveroo|ubereats|uber.?eats|just.?eat/i.test(p)) ||
    (source.platformRankPercentile != null && source.platformRankPercentile <= 0.2);

  const city = source.city?.trim().toLowerCase() ?? "";
  const competitive =
    COMPETITIVE_CITIES.has(city) ||
    [...COMPETITIVE_CITIES].some((c) => city.includes(c));

  const datedUx = source.weakWebsite === true || source.websiteStale === true;

  return {
    place_id: source.placeId ?? null,
    name: source.name,
    locations: source.locationCount ?? null,
    is_independent: chain || hotel ? false : true,
    is_chain: chain,
    is_hotel: hotel,
    rating: source.rating ?? null,
    review_count: source.reviewCount ?? null,
    days_since_last_instagram: source.instagramPostGapDays ?? null,
    website_age_years: ageYears,
    has_dated_ux: datedUx,
    has_recent_google_posts:
      source.hasGoogleBusinessPosts == null ? null : source.hasGoogleBusinessPosts,
    review_response_rate: source.reviewResponseRate ?? null,
    is_ghost_kitchen: source.isGhostKitchen ?? false,
    has_website: Boolean(websiteUrl),
    has_google_profile: true,
    active_on_deliveroo_or_uber: onDelivery,
    is_competitive_city: competitive,
    on_major_platform: source.onMajorPlatform ?? false,
    competitor_ratings_nearby: source.competitorRatingsNearby ?? null,
    website_notes: source.websiteNotes ?? null,
  };
}
