#!/usr/bin/env npx tsx
/**
 * Bulk seed lead prospects until LEAD_ENGINE_SEED_TARGET contactable rows exist.
 *
 * Usage:
 *   npm run lead-engine:seed
 */

import { platformContactableWhere } from "@/lib/lead-engine/contactable-query";
import { iterateLeadCities } from "@/lib/lead-engine/city-rotation";
import { pruneLegacyLeads } from "@/lib/lead-engine/prune-legacy-leads";
import { runLeadFinder } from "@/lib/lead-engine/run-lead-finder";
import { runOpportunityAnalyzer } from "@/lib/lead-engine/run-opportunity-analyzer";
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

const target = Math.max(1, Number(process.env.LEAD_ENGINE_SEED_TARGET?.trim() || "3000") || 3000);
const perCity = Math.max(10, Number(process.env.LEAD_ENGINE_SEED_PER_SLOT?.trim() || "50") || 50);
const delayMs = Math.max(500, Number(process.env.LEAD_ENGINE_SEED_DELAY_MS?.trim() || "1500") || 1500);

async function contactableCount() {
  return prisma.leadProspect.count({
    where: platformContactableWhere(workspaceId),
  });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const reviewMax = Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "2500");
  if (reviewMax < 1000) {
    console.warn("Warning: set OUTBOUND_REVIEW_MAX=2500 for lead engine seeding.");
  }
  const pruned = await pruneLegacyLeads(workspaceId);
  console.log(
    `Pruned: archived ${pruned.archivedLegacy} legacy leads, cleared ${pruned.clearedBadEmails} bad emails`,
  );
  console.log(`Platform-first seed → target ${target} golden-profile prospects`);
  console.log(`Starting pool: ${pruned.platformContactable} contactable`);

  let round = 0;
  let prospectingReadyLogged = false;
  const prospectingCheckpoint = 300;
  const cities = [...iterateLeadCities()];
  const idleStopAfter = Math.max(
    cities.length * 5,
    Number(process.env.LEAD_ENGINE_SEED_IDLE_ROUNDS?.trim() || "0") || cities.length * 5,
  );
  console.log(`Cities in rotation: ${cities.length}`);

  while ((await contactableCount()) < target) {
    round++;
    const slot = cities[(round - 1) % cities.length];
    if (!slot) break;

    console.log(`\n[round ${round}] platforms in ${slot.city}, ${slot.country}`);

    const finder = await runLeadFinder(workspaceId, {
      city: slot.city,
      country: slot.country,
      max: perCity,
    });

    console.log(
      `  discovered=${finder.discovered} inserted=${finder.inserted} contactable=${finder.contactableTotal}`,
    );

    const analyzer = await runOpportunityAnalyzer(workspaceId, { max: perCity });
    console.log(`  analyzed=${analyzer.analyzed} processed=${analyzer.processed}`);

    const count = await contactableCount();
    console.log(`  total contactable: ${count}/${target}`);

    if (!prospectingReadyLogged && count >= prospectingCheckpoint) {
      prospectingReadyLogged = true;
      console.log("\n*** PROSPECTING READY — 300+ contactable leads ***");
      console.log("Open /dashboard/outbound → Lead Engine tab to start approving.\n");
    }

    if (finder.inserted === 0 && analyzer.analyzed === 0 && round > idleStopAfter) {
      console.warn(`No progress after ${idleStopAfter} rounds — stopping early.`);
      break;
    }

    await sleep(delayMs);
  }

  const final = await contactableCount();
  console.log(`\nDone. Contactable prospects: ${final}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
