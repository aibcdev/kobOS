#!/usr/bin/env npx tsx
/**
 * Country-wide platform scrape audit — all UK/IE cities.
 *
 * Usage: npm run lead-engine:audit-platforms
 */

import { ALL_LEAD_ENGINE_CITIES } from "@/lib/lead-engine/scrapers/uk-ie-cities";
import { scrapeDeliverooForCity } from "@/lib/lead-engine/scrapers/deliveroo";
import { scrapeJustEatForCity } from "@/lib/lead-engine/scrapers/justeat";
import { scrapeUberEatsForCity } from "@/lib/lead-engine/scrapers/ubereats";
import { mergePlatformListings } from "@/lib/lead-engine/merge-platform-listings";

const limitCities = Number(process.env.LEAD_ENGINE_AUDIT_CITY_LIMIT?.trim() || "0") || 0;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const cities = limitCities > 0 ? ALL_LEAD_ENGINE_CITIES.slice(0, limitCities) : ALL_LEAD_ENGINE_CITIES;
  let totalJe = 0;
  let totalDr = 0;
  let totalUe = 0;
  let totalMerged = 0;

  console.log(`Auditing ${cities.length} cities…\n`);

  for (const slot of cities) {
    const [je, dr, ue] = await Promise.all([
      scrapeJustEatForCity(slot.city, slot.country),
      slot.country === "GB" ? scrapeDeliverooForCity(slot.city, slot.country) : Promise.resolve([]),
      scrapeUberEatsForCity(slot.city, slot.country),
    ]);
    const merged = mergePlatformListings([...je, ...dr, ...ue]);

    totalJe += je.length;
    totalDr += dr.length;
    totalUe += ue.length;
    totalMerged += merged.length;

    console.log(
      `${slot.city.padEnd(22)} JE:${String(je.length).padStart(4)} DR:${String(dr.length).padStart(4)} UE:${String(ue.length).padStart(4)} → top20%: ${merged.length}`,
    );

    await sleep(300);
  }

  console.log(`\nTOTAL raw JE:${totalJe} DR:${totalDr} UE:${totalUe} | merged top20%: ${totalMerged}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
