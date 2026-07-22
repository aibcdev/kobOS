#!/usr/bin/env npx tsx
/**
 * Re-sync Deliveroo / Just Eat / Uber tags onto existing prospects by city.
 *
 * Usage: npm run lead-engine:sync-platforms
 */

import { ALL_LEAD_ENGINE_CITIES } from "@/lib/lead-engine/scrapers/uk-ie-cities";
import { syncPlatformTagsForCity } from "@/lib/lead-engine/sync-platform-tags";
import { prisma } from "@/lib/db/prisma";

function requireWorkspaceId(): string {
  const id = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!id) {
    console.error("Set OUTBOUND_WORKSPACE_RESTAURANT_ID in .env.local");
    process.exit(1);
  }
  return id;
}

const workspaceId = requireWorkspaceId();

async function main() {
  process.env.LEAD_ENGINE_DR_GEOHASH_LIMIT = process.env.LEAD_ENGINE_DR_GEOHASH_LIMIT ?? "1";
  process.env.LEAD_ENGINE_JE_POSTCODES_PER_CITY = process.env.LEAD_ENGINE_JE_POSTCODES_PER_CITY ?? "6";

  let total = 0;
  for (const slot of ALL_LEAD_ENGINE_CITIES) {
    console.log(`Sync ${slot.city}, ${slot.country}…`);
    const result = await syncPlatformTagsForCity(workspaceId, slot.city, slot.country);
    total += result.updated;
    console.log(`  updated ${result.updated}`);
  }
  console.log(`Done. Updated ${total} prospects with multi-app tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
