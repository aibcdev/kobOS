/**
 * Quarantine PENDING_APPROVAL outbound leads whose website fails restaurant identity.
 * Does NOT send email. Archives bad leads and clears prospect links so they won't go out.
 *
 *   npx dotenv -e .env -e .env.local -- npx tsx scripts/outbound-quarantine-website-mismatch.ts
 */
import { prisma } from "../lib/db/prisma";
import { verifyWebsiteMatchesRestaurant } from "../lib/audit/website-identity";
import { LeadProspectStatus, OutboundLeadStatus } from "@prisma/client";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID!;
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID required");

  const dryRun = process.env.DRY_RUN === "1";
  const leads = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: OutboundLeadStatus.PENDING_APPROVAL },
    select: {
      id: true,
      restaurantName: true,
      city: true,
      websiteUrl: true,
      contactEmail: true,
      visibilityAuditId: true,
    },
  });

  const ok: string[] = [];
  const bad: Array<{ id: string; restaurant: string; website: string; reason: string }> = [];
  const skippedFetch: Array<{ id: string; restaurant: string; reason: string }> = [];
  const noSite: string[] = [];

  for (const lead of leads) {
    const name = lead.restaurantName?.trim() || "Restaurant";
    const city = lead.city?.trim() || "Your area";
    const website = lead.websiteUrl?.trim();
    if (!website) {
      noSite.push(lead.id);
      bad.push({ id: lead.id, restaurant: name, website: "(none)", reason: "no_website" });
      continue;
    }
    const identity = await verifyWebsiteMatchesRestaurant({
      restaurantName: name,
      city,
      websiteUrl: website,
    });
    if (identity.matched) {
      ok.push(lead.id);
      continue;
    }
    // Don't archive on transient fetch failures / bot blocks — leave for manual review.
    if (
      /HTTP 429|HTTP 5\d\d|fetch failed|blocked bot|cannot verify ownership/i.test(identity.reason)
    ) {
      skippedFetch.push({ id: lead.id, restaurant: name, reason: identity.reason });
      continue;
    }
    bad.push({
      id: lead.id,
      restaurant: name,
      website,
      reason: identity.reason,
    });
  }

  console.log(
    JSON.stringify(
      {
        total: leads.length,
        matchedOk: ok.length,
        mismatched: bad.length,
        skippedFetch: skippedFetch.length,
        noWebsite: noSite.length,
        dryRun,
        samples: bad.slice(0, 20),
        skippedSamples: skippedFetch.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (dryRun || bad.length === 0) return;

  for (const row of bad) {
    await prisma.$transaction(async (tx) => {
      await tx.leadProspect.updateMany({
        where: { outboundLeadId: row.id },
        data: {
          status: LeadProspectStatus.ARCHIVED,
          outboundLeadId: null,
          disqualifiers: { push: "website_mismatch" },
        },
      });
      await tx.outboundLead.update({
        where: { id: row.id },
        data: {
          status: OutboundLeadStatus.ARCHIVED,
          insightSummary: `QUARANTINED website_mismatch: ${row.reason}`.slice(0, 500),
        },
      });
    });
  }

  console.log(`Archived ${bad.length} mismatched PENDING_APPROVAL leads.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
