import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { platformFoundWhere, platformQualifiedWhere } from "../lib/lead-engine/contactable-query";
import { runOpportunityAnalyzer } from "../lib/lead-engine/run-opportunity-analyzer";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";
import { runLeadFinder } from "../lib/lead-engine/run-lead-finder";
import { iterateLeadCities } from "../lib/lead-engine/city-rotation";

async function snapshot(wid: string) {
  const locationMax = getLeadEngineConfig().locationMax;
  const [lp, found, emailReady, score70, discoveredEmail, outboundPending, oversized] = await Promise.all([
    prisma.leadProspect.count({ where: { workspaceRestaurantId: wid, status: { not: "ARCHIVED" } } }),
    prisma.leadProspect.count({ where: platformFoundWhere(wid) }),
    prisma.leadProspect.count({ where: platformQualifiedWhere(wid) }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: { not: "ARCHIVED" },
        kobOpportunityScore: { gte: 70 },
        contactEmail: { not: null },
        locationCount: { gte: 1, lte: locationMax },
      },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: "DISCOVERED",
        contactEmail: { not: null },
      },
    }),
    prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    }),
    prisma.leadProspect.count({
      where: {
        workspaceRestaurantId: wid,
        status: { not: "ARCHIVED" },
        locationCount: { gt: locationMax },
      },
    }),
  ]);
  return {
    lp,
    found,
    emailReady,
    score70WithEmail: score70,
    discoveredWithEmail: discoveredEmail,
    outboundPending,
    oversizedLocations: oversized,
    locationMax,
  };
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const targetQualified = Math.max(100, Number(process.env.LEAD_ENGINE_SEED_TARGET || "500") || 500);
  const analyzerMax = Math.max(50, Number(process.env.LEAD_ENGINE_ANALYZER_BATCH || "150") || 150);
  const writerMax = Math.max(20, Number(process.env.LEAD_ENGINE_WRITER_BATCH || "80") || 80);
  const finderRoundsRaw = process.env.LEAD_ENGINE_FINDER_ROUNDS;
  const finderRounds =
    finderRoundsRaw === undefined || finderRoundsRaw.trim() === ""
      ? 8
      : Math.max(0, Number(finderRoundsRaw) || 0);
  const perCity = Math.max(40, Number(process.env.LEAD_ENGINE_SEED_PER_SLOT || "100") || 100);

  console.log("=== ICP outbound kickoff (own stack: Places + platforms + opportunity score) ===");
  console.log("start", await snapshot(wid));

  if (finderRounds > 0) {
    const cities = [...iterateLeadCities()];
    for (let i = 0; i < finderRounds; i++) {
      const slot = cities[i % cities.length]!;
      console.log(`\n[finder ${i + 1}/${finderRounds}] ${slot.city}`);
      try {
        const finder = await runLeadFinder(wid, { city: slot.city, country: slot.country, max: perCity });
        console.log(
          `  discovered=${finder.discovered} inserted=${finder.inserted} contactable=${finder.contactableTotal}`,
        );
      } catch (e) {
        console.error("  finder failed:", e instanceof Error ? e.message : e);
      }
    }
  } else {
    console.log("\n[finder] skipped (LEAD_ENGINE_FINDER_ROUNDS=0) — analyzing existing pool");
  }

  // Analyze until we have enough 70+ with email or queue drains
  for (let pass = 1; pass <= 12; pass++) {
    const before = await snapshot(wid);
    if (before.score70WithEmail >= targetQualified) {
      console.log(`\nReached ${before.score70WithEmail} score≥70 with email (target ${targetQualified})`);
      break;
    }
    if (before.discoveredWithEmail === 0) {
      console.log("\nNo more DISCOVERED+email rows to analyze");
      break;
    }
    console.log(`\n[analyzer pass ${pass}] queue=${before.discoveredWithEmail} score70=${before.score70WithEmail}`);
    const analyzer = await runOpportunityAnalyzer(wid, { max: analyzerMax });
    console.log(`  processed=${analyzer.processed} analyzed=${analyzer.analyzed} skipped=${JSON.stringify(analyzer.skipped)}`);
  }

  console.log("\n[outreach writer]");
  const writer = await runOutreachWriter(wid, { max: writerMax });
  console.log("  writer", writer);

  console.log("\n=== final ===");
  console.log(await snapshot(wid));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
