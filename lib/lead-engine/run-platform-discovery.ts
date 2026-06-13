import { scrapeDeliverooForCity } from "@/lib/lead-engine/scrapers/deliveroo";
import { scrapeJustEatForCity } from "@/lib/lead-engine/scrapers/justeat";
import { scrapeUberEatsForCity } from "@/lib/lead-engine/scrapers/ubereats";
import { mergePlatformListings, type MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";

export async function discoverPlatformLeadsForCity(
  city: string,
  country: "GB" | "IE",
): Promise<MergedPlatformLead[]> {
  const listings: PlatformListing[] = [];

  const [justEat, deliveroo, uberEats] = await Promise.all([
    scrapeJustEatForCity(city, country),
    country === "GB" ? scrapeDeliverooForCity(city, country) : Promise.resolve([]),
    scrapeUberEatsForCity(city, country),
  ]);

  listings.push(...justEat, ...deliveroo, ...uberEats);
  return mergePlatformListings(listings);
}
