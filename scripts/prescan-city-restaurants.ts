/**
 * Pre-scan restaurants in a city and store a real KOB score for each.
 *
 * The audit report shows a prospect three named local restaurants that score at or
 * above them. That is only honest if those peers were actually measured, so we build
 * an index ahead of time with the cheap scorer (crawl + listing, no AI, no PageSpeed).
 *
 * Usage:
 *   npm run prescan:city -- --city "Nottingham"
 *   npm run prescan:city -- --city "Nottingham" --limit 60
 *   npm run prescan:city -- --all            # every target city below
 *   npm run prescan:city -- --city "Leeds" --refresh   # rescore entries older than 30 days
 */
import { scoreRestaurantLightweight } from "@/lib/audit/lightweight-score";
import { prisma } from "@/lib/db/prisma";
import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import {
  placesGeocodeCityUk,
  placesSearchNearbyRestaurants,
  type NearbyPlace,
} from "@/lib/places/google-places-server";

/** UK and Ireland first — the markets outbound is working. */
const TARGET_CITIES = [
  "Nottingham",
  "Leeds",
  "Manchester",
  "Birmingham",
  "Bristol",
  "Sheffield",
  "Liverpool",
  "Newcastle upon Tyne",
  "Leicester",
  "Brighton",
  "Cardiff",
  "Edinburgh",
  "Glasgow",
  "Dublin",
  "Cork",
  "Belfast",
] as const;

const REFRESH_AFTER_DAYS = 30;
const DEFAULT_LIMIT = 40;
const SCAN_DELAY_MS = 400;

type Args = {
  cities: string[];
  limit: number;
  refresh: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  };
  const city = get("--city");
  return {
    cities: argv.includes("--all") ? [...TARGET_CITIES] : city ? [city] : [],
    limit: Number(get("--limit") ?? DEFAULT_LIMIT),
    refresh: argv.includes("--refresh"),
    dryRun: argv.includes("--dry-run"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function countryForCity(city: string): string {
  if (["Dublin", "Cork", "Galway", "Limerick"].includes(city)) return "IE";
  return "GB";
}

/** Google Places nearby search, widening until we have enough candidates. */
async function discoverFromPlaces(city: string, want: number): Promise<NearbyPlace[]> {
  const geo = await placesGeocodeCityUk(city);
  if (!geo) {
    console.warn(`[prescan] could not geocode ${city}`);
    return [];
  }

  const byPlaceId = new Map<string, NearbyPlace>();
  for (const radius of [3000, 6000, 12000]) {
    const batch = await placesSearchNearbyRestaurants(
      geo.lat,
      geo.lng,
      undefined,
      Math.min(20, want),
      radius,
    );
    for (const p of batch) {
      if (isLikelyChainRestaurant(p.name, null)) continue;
      if (!byPlaceId.has(p.placeId)) byPlaceId.set(p.placeId, p);
    }
    if (byPlaceId.size >= want) break;
  }
  return [...byPlaceId.values()].slice(0, want);
}

/** Leads we already discovered are free candidates — no extra Places spend. */
async function discoverFromLeadPool(city: string, want: number): Promise<NearbyPlace[]> {
  const leads = await prisma.leadProspect.findMany({
    where: { city: { equals: city, mode: "insensitive" }, placeId: { not: null } },
    select: { placeId: true, name: true, websiteUrl: true, rating: true, reviewCount: true },
    orderBy: { updatedAt: "desc" },
    take: want,
  });
  return leads
    .filter((l) => l.placeId && !isLikelyChainRestaurant(l.name, null))
    .map((l) => ({
      placeId: l.placeId as string,
      name: l.name,
      lat: 0,
      lng: 0,
      rating: l.rating ?? null,
      userRatingCount: l.reviewCount ?? null,
      photoCount: null,
      websiteUri: l.websiteUrl ?? null,
    }));
}

async function prescanCity(city: string, args: Args): Promise<void> {
  const country = countryForCity(city);
  const [fromPlaces, fromLeads] = await Promise.all([
    discoverFromPlaces(city, args.limit),
    discoverFromLeadPool(city, args.limit),
  ]);

  const candidates = new Map<string, NearbyPlace>();
  for (const p of [...fromPlaces, ...fromLeads]) {
    if (!candidates.has(p.placeId)) candidates.set(p.placeId, p);
  }

  const staleBefore = new Date(Date.now() - REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.restaurantScoreIndex.findMany({
    where: { placeId: { in: [...candidates.keys()] } },
    select: { placeId: true, scoredAt: true },
  });
  const scoredAtByPlace = new Map(existing.map((e) => [e.placeId, e.scoredAt]));

  const todo = [...candidates.values()].filter((p) => {
    const scoredAt = scoredAtByPlace.get(p.placeId);
    if (!scoredAt) return true;
    return args.refresh && scoredAt < staleBefore;
  });

  console.log(
    `[prescan] ${city}: ${candidates.size} candidates, ${todo.length} to score` +
      (args.dryRun ? " (dry run)" : ""),
  );
  if (args.dryRun) return;

  let scored = 0;
  for (const place of todo) {
    try {
      const result = await scoreRestaurantLightweight({
        name: place.name,
        city,
        websiteUrl: place.websiteUri,
        placeId: place.placeId,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        photoCount: place.photoCount,
      });

      const data = {
        name: place.name,
        city,
        country,
        websiteUrl: place.websiteUri,
        lat: place.lat || null,
        lng: place.lng || null,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        photoCount: place.photoCount,
        kobScore: result.kobScore,
        scanDepth: "lightweight",
        scoredAt: new Date(),
      };
      await prisma.restaurantScoreIndex.upsert({
        where: { placeId: place.placeId },
        create: { placeId: place.placeId, ...data },
        update: data,
      });
      scored += 1;
      console.log(`  ${result.kobScore.toString().padStart(3)} ${place.name}`);
    } catch (e) {
      console.warn(`  !! ${place.name}:`, e instanceof Error ? e.message : e);
    }
    await sleep(SCAN_DELAY_MS);
  }

  console.log(`[prescan] ${city}: stored ${scored} scores`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.cities.length === 0) {
    console.error(
      'Usage: npm run prescan:city -- --city "Nottingham" [--limit 40] [--refresh] [--dry-run]\n' +
        "   or: npm run prescan:city -- --all",
    );
    process.exit(1);
  }
  if (!process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    console.error("GOOGLE_PLACES_API_KEY is not set — cannot discover restaurants.");
    process.exit(1);
  }

  for (const city of args.cities) {
    await prescanCity(city, args);
  }

  const total = await prisma.restaurantScoreIndex.count();
  console.log(`[prescan] index now holds ${total} scored restaurants`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
