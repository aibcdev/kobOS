#!/usr/bin/env npx tsx
/**
 * Fast bulk import — platform scrape only, no slow Google enrichment.
 * Target: 3,000+ found restaurants sorted by KOB score.
 *
 * Usage: npm run lead-engine:bulk-import
 */

import { bulkImportPlatformLeadsForCity } from "@/lib/lead-engine/bulk-import-platform-leads";
import { ALL_LEAD_ENGINE_CITIES } from "@/lib/lead-engine/scrapers/uk-ie-cities";
import { platformFoundWhere } from "@/lib/lead-engine/contactable-query";
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
const target = Math.max(100, Number(process.env.LEAD_ENGINE_SEED_TARGET?.trim() || "3000") || 3000);
const perCity = Math.max(50, Number(process.env.LEAD_ENGINE_BULK_PER_CITY?.trim() || "200") || 200);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function foundCount() {
  return prisma.leadProspect.count({ where: platformFoundWhere(workspaceId) });
}

async function main() {
  process.env.LEAD_ENGINE_DR_GEOHASH_LIMIT = process.env.LEAD_ENGINE_DR_GEOHASH_LIMIT ?? "2";
  process.env.LEAD_ENGINE_UE_POSTCODES_PER_CITY = process.env.LEAD_ENGINE_UE_POSTCODES_PER_CITY ?? "2";
  process.env.LEAD_ENGINE_JE_POSTCODES_PER_CITY = process.env.LEAD_ENGINE_JE_POSTCODES_PER_CITY ?? "8";

  const cities = [...ALL_LEAD_ENGINE_CITIES];
  console.log(`Bulk import → target ${target} found prospects (${cities.length} cities)`);
  console.log(`Starting: ${await foundCount()}`);

  let round = 0;
  while ((await foundCount()) < target) {
    const slot = cities[round % cities.length];
    if (!slot) break;
    round++;

    console.log(`\n[${round}] ${slot.city}, ${slot.country}`);
    try {
      const result = await bulkImportPlatformLeadsForCity(
        workspaceId,
        slot.city,
        slot.country,
        { max: perCity },
      );
      console.log(
        `  discovered=${result.discovered} inserted=${result.inserted} total=${result.totalFound}/${target}`,
      );
      if (Object.keys(result.skipped).length) {
        console.log(`  skipped=${JSON.stringify(result.skipped)}`);
      }
    } catch (e) {
      console.error(`  failed:`, e instanceof Error ? e.message : e);
      await prisma.$disconnect();
      await sleep(3000);
      continue;
    }

    if (round % 5 === 0) await prisma.$disconnect();
    await sleep(800);
  }

  console.log(`\nDone. Found prospects: ${await foundCount()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
