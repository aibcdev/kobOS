/**
 * Backfill lastReviewAt for PENDING_APPROVAL leads, then archive inactive
 * (no Google review in 6 months AND no IG in 2 years / no IG).
 */
import { prisma } from "../lib/db/prisma";
import { enrichLeadFromGoogle } from "../lib/lead-engine/google-enrich";
import { isLikelyClosedOrAbandoned } from "../lib/lead-engine/high-street-icp";
import { placesPlaceAuditEnrichment } from "../lib/places/google-places-server";
import { runOutreachWriter } from "../lib/lead-engine/run-outreach-writer";
import { LeadProspectStatus } from "@prisma/client";
import { getLeadEngineConfig } from "../lib/lead-engine/config";
import { isFastFoodOrPubFormat, passesHighStreetRestaurantIcp } from "../lib/lead-engine/high-street-icp";
import { isExcludedFromOutboundIcp } from "../lib/outbound/chain-denylist";

function parseLastReviewAt(reviews: Array<{ publishTime?: string | null }>): Date | null {
  let latest: Date | null = null;
  for (const r of reviews) {
    if (!r.publishTime) continue;
    const d = new Date(r.publishTime);
    if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }
  return latest;
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");
  const config = getLeadEngineConfig();

  const pending = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    include: { leadProspect: true },
  });

  let updated = 0;
  let failed = 0;
  for (const lead of pending) {
    const p = lead.leadProspect;
    if (!p || p.lastReviewAt) continue;

    try {
      let lastReviewAt: Date | null = null;
      if (p.placeId) {
        const enrichment = await placesPlaceAuditEnrichment(p.placeId);
        lastReviewAt = parseLastReviewAt(enrichment?.reviews ?? []);
      }
      if (!lastReviewAt) {
        const g = await enrichLeadFromGoogle(p.name, p.city, (p.country as "GB" | "IE") || "GB");
        lastReviewAt = g?.lastReviewAt ?? null;
        if (g?.placeId && !p.placeId) {
          await prisma.leadProspect.update({
            where: { id: p.id },
            data: { placeId: g.placeId, lastReviewAt },
          });
          updated++;
          continue;
        }
      }
      if (lastReviewAt) {
        await prisma.leadProspect.update({
          where: { id: p.id },
          data: { lastReviewAt },
        });
        updated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    if ((updated + failed) % 10 === 0) {
      console.log(`  progress updated=${updated} failed=${failed}`);
    }
  }
  console.log({ reviewBackfill: { updated, failed } });

  // Re-load and archive inactive / bad format
  const refreshed = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    include: { leadProspect: true },
  });

  const dropLead: string[] = [];
  const dropProspect: { id: string; reason: string }[] = [];
  for (const lead of refreshed) {
    const p = lead.leadProspect;
    if (!p) {
      dropLead.push(lead.id);
      continue;
    }
    let reason: string | null = null;
    if (isExcludedFromOutboundIcp(p.name, p.websiteUrl) || isFastFoodOrPubFormat(p.name)) {
      reason = "fast_food_or_pub";
    } else if (
      isLikelyClosedOrAbandoned({
        lastReviewAt: p.lastReviewAt,
        instagramUrl: p.instagramUrl,
        instagramPostGapDays: p.instagramPostGapDays,
      })
    ) {
      reason = "inactive_online";
    } else {
      const hs = passesHighStreetRestaurantIcp({
        name: p.name,
        websiteUrl: p.websiteUrl,
        reviewCount: p.reviewCount,
        googleReviewMin: config.googleReviewMin,
        lastReviewAt: p.lastReviewAt,
        instagramUrl: p.instagramUrl,
        instagramPostGapDays: p.instagramPostGapDays,
        businessType: p.businessType,
        deliveryPlatforms: p.deliveryPlatforms,
        hasOnlineOrdering: p.hasOnlineOrdering,
      });
      if (!hs.ok) reason = hs.reason;
    }
    // Still no lastReviewAt after backfill + no IG → treat as inactive
    if (!reason && !p.lastReviewAt && !p.instagramUrl?.trim()) {
      reason = "inactive_online";
    }
    if (reason) {
      dropLead.push(lead.id);
      dropProspect.push({ id: p.id, reason });
    }
  }

  if (dropLead.length) {
    await prisma.outboundLead.updateMany({
      where: { id: { in: dropLead } },
      data: { status: "ARCHIVED" },
    });
  }
  for (const row of dropProspect) {
    await prisma.leadProspect.update({
      where: { id: row.id },
      data: {
        status: LeadProspectStatus.ARCHIVED,
        outboundLeadId: null,
        disqualifiers: [row.reason],
      },
    });
  }

  const reasons: Record<string, number> = {};
  for (const r of dropProspect) reasons[r.reason] = (reasons[r.reason] || 0) + 1;

  let pendingNow = await prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });
  console.log({ archived: dropLead.length, reasons, pendingNow });

  // Top up from ANALYZED pool
  while (pendingNow < 100) {
    const w = await runOutreachWriter(wid, { max: 40 });
    pendingNow = await prisma.outboundLead.count({
      where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    });
    console.log("writer", w, pendingNow);
    if (w.queued === 0) break;
  }

  const sample = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    take: 15,
    include: {
      leadProspect: {
        select: { name: true, reviewCount: true, city: true, lastReviewAt: true, instagramUrl: true },
      },
    },
  });
  console.log(
    JSON.stringify(
      {
        finalPending: pendingNow,
        sample: sample.map((s) => ({
          name: s.leadProspect?.name,
          reviews: s.leadProspect?.reviewCount,
          city: s.leadProspect?.city,
          lastReviewDays: s.leadProspect?.lastReviewAt
            ? Math.floor((Date.now() - s.leadProspect.lastReviewAt.getTime()) / 86400000)
            : null,
          hasIg: Boolean(s.leadProspect?.instagramUrl),
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
