/**
 * Rescue leads wrongly archived by opportunity-score park when ICP Fit was ≥70.
 * Then queue them into PENDING_APPROVAL.
 *
 *   npm run outbound:rescue-icp
 */
import { LeadProspectStatus } from "@prisma/client";
import { prisma } from "../lib/db/prisma";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { isFastFoodOrPubFormat } from "../lib/lead-engine/high-street-icp";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";
import { mapProspectToIcpInput } from "../lib/outbound/map-to-icp-input";
import { scoreIcp } from "../lib/outbound/score-icp";
import { isValidProspectEmail } from "../lib/outbound/validate-prospect-email";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");
  const cfg = getLeadEngineConfig();
  const limit = Math.max(50, Number(process.env.OUTBOUND_RESCUE_LIMIT || "500") || 500);

  const archived = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: LeadProspectStatus.ARCHIVED,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      outboundLeadId: null,
      OR: [
        { disqualifiers: { has: "opportunity_park_fit65" } },
        { disqualifiers: { has: "opportunity_park_fit50" } },
        { disqualifiers: { hasSome: ["opportunity_park_fit65", "opportunity_park_fit50", "opportunity_park_fit60"] } },
        { kobOpportunityScore: { gte: 50, lte: 69 } },
      ],
    },
    take: limit,
  });

  console.log(`candidates=${archived.length}`);

  let rescued = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const p of archived) {
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl) || isFastFoodOrPubFormat(p.name)) {
      skipped++;
      continue;
    }
    if (!isValidProspectEmail(p.contactEmail!, p.websiteUrl).ok) {
      skipped++;
      continue;
    }

    const mapped = mapProspectToIcpInput({
      placeId: p.placeId,
      name: p.name,
      city: p.city,
      websiteUrl: p.websiteUrl,
      rating: p.rating,
      reviewCount: p.reviewCount,
      locationCount: p.locationCount ?? 1,
      instagramPostGapDays: p.instagramPostGapDays,
      websiteCopyrightYear: p.websiteCopyrightYear,
      websiteStale: p.websiteStale,
      weakWebsite: p.weakWebsite,
      hasGoogleBusinessPosts: p.hasGoogleBusinessPosts,
      deliveryPlatforms: p.deliveryPlatforms,
      platformRankPercentile: p.platformRankPercentile,
    });
    // If location unknown, assume 1 so ICP can award +30 (single-site independent default)
    if (mapped.locations == null) mapped.locations = 1;

    const icp = scoreIcp(mapped);
    if (icp.status !== "qualified") {
      skipped++;
      continue;
    }

    await prisma.leadProspect.update({
      where: { id: p.id },
      data: {
        status: LeadProspectStatus.ANALYZED,
        kobOpportunityScore: icp.fit_score,
        locationCount: mapped.locations,
        disqualifiers: [],
        opportunities: icp.personalization_hooks,
        scoreBreakdown: {
          version: icp.version,
          status: icp.status,
          fit_score: icp.fit_score,
          matched_factors: icp.matched_factors,
          recommended_email_angle: icp.recommended_email_angle,
          rescuedFrom: "opportunity_park",
        },
        analyzedAt: new Date(),
      },
    });
    rescued++;
    ids.push(p.id);
    if (rescued % 25 === 0) console.log(`  rescued=${rescued}`);
  }

  console.log({ rescued, skipped });

  if (ids.length) {
    const writer = await runOutreachWriter(wid, { max: Math.min(cfg.outreachDailyCap, ids.length), prospectIds: ids });
    console.log("writer", writer);
  }

  const pending = await prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
  console.log({ pending });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
