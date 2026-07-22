#!/usr/bin/env npx tsx
/**
 * Bulk seed lead prospects until LEAD_ENGINE_SEED_TARGET contactable rows exist.
 *
 * Usage:
 *   npm run lead-engine:seed
 */

import { platformContactableWhere, platformQualifiedWhere } from "@/lib/lead-engine/contactable-query";
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
const perCity = Math.max(20, Number(process.env.LEAD_ENGINE_SEED_PER_SLOT?.trim() || "120") || 120);
const delayMs = Math.max(500, Number(process.env.LEAD_ENGINE_SEED_DELAY_MS?.trim() || "1500") || 1500);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
      if (!["P1017", "P2024"].includes(code) || attempt === maxAttempts) throw e;
      const waitMs = 1500 * attempt;
      console.warn(`${label}: db reconnect, retry ${attempt}/${maxAttempts - 1} in ${waitMs}ms`);
      await prisma.$disconnect();
      await sleep(waitMs);
    }
  }
  throw new Error(`${label}: unreachable`);
}

async function qualifiedCount() {
  return withDbRetry(
    () =>
      prisma.leadProspect.count({
        where: platformQualifiedWhere(workspaceId),
      }),
    "qualifiedCount",
  );
}

async function main() {
  const reviewMax = Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "2500");
  if (reviewMax < 1000) {
    console.warn("Warning: set OUTBOUND_REVIEW_MAX=2500 for lead engine seeding.");
  }
  const pruned = await withDbRetry(() => pruneLegacyLeads(workspaceId), "pruneLegacyLeads");
  console.log(
    `Pruned: archived ${pruned.archivedLegacy} legacy, ${pruned.archivedOffProfile} off-profile, cleared ${pruned.clearedBadEmails} bad emails`,
  );
  console.log(`Platform-first seed → target ${target} qualified prospects`);
  console.log(`Starting pool: ${pruned.platformQualified} qualified (${pruned.platformContactable} ready to contact)`);

  let round = 0;
  let prospectingReadyLogged = false;
  const prospectingCheckpoint = 300;
  const cities = [...iterateLeadCities()];
  const idleStopAfter = Math.max(
    cities.length * 8,
    Number(process.env.LEAD_ENGINE_SEED_IDLE_ROUNDS?.trim() || "0") || cities.length * 8,
  );
  console.log(`Cities in rotation: ${cities.length}`);

  while ((await qualifiedCount()) < target) {
    round++;
    const slot = cities[(round - 1) % cities.length];
    if (!slot) break;

    console.log(`\n[round ${round}] platforms in ${slot.city}, ${slot.country}`);

    let finder = { discovered: 0, inserted: 0, contactableTotal: 0, skipped: {} as Record<string, number> };
    let analyzer = { analyzed: 0, processed: 0 };

    try {
      finder = await runLeadFinder(workspaceId, {
        city: slot.city,
        country: slot.country,
        max: perCity,
      });

      console.log(
        `  discovered=${finder.discovered} inserted=${finder.inserted} contactable=${finder.contactableTotal}`,
      );
      if (Object.keys(finder.skipped).length) {
        console.log(`  skipped=${JSON.stringify(finder.skipped)}`);
      }

      analyzer = await runOpportunityAnalyzer(workspaceId, { max: perCity });
      console.log(`  analyzed=${analyzer.analyzed} processed=${analyzer.processed}`);
    } catch (e) {
      console.error(`  round ${round} failed — continuing after pause:`, e instanceof Error ? e.message : e);
      await prisma.$disconnect();
      await sleep(delayMs * 4);
      continue;
    }

    const count = await qualifiedCount();
    const withContact = await withDbRetry(
      () =>
        prisma.leadProspect.count({
          where: platformContactableWhere(workspaceId),
        }),
      "contactableCount",
    );
    console.log(`  total qualified: ${count}/${target} (${withContact} ready to contact)`);

    if (!prospectingReadyLogged && count >= prospectingCheckpoint) {
      prospectingReadyLogged = true;
      console.log("\n*** PROSPECTING READY — 300+ contactable leads ***");
      console.log("Open /dashboard/outbound → Lead Engine tab to start approving.\n");
    }

    if (finder.inserted === 0 && analyzer.analyzed === 0 && round > idleStopAfter) {
      console.warn(`No progress after ${idleStopAfter} rounds — stopping early.`);
      break;
    }

    if (round % 10 === 0) {
      await prisma.$disconnect();
    }

    await sleep(delayMs);
  }

  const final = await qualifiedCount();
  console.log(`\nDone. Qualified prospects: ${final}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
