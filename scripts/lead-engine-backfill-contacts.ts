#!/usr/bin/env npx tsx
/**
 * Scan every prospect website for email + phone.
 *
 * Usage: npm run lead-engine:backfill-contacts
 */

import { platformFoundWhere, platformQualifiedWhere } from "@/lib/lead-engine/contactable-query";
import { computeKobOpportunityScore } from "@/lib/lead-engine/kob-opportunity-score";
import type { MergedPlatformLead } from "@/lib/lead-engine/merge-platform-listings";
import { scanLeadContacts } from "@/lib/lead-engine/scan-lead-contacts";
import { prisma } from "@/lib/db/prisma";
import { LeadProspectStatus, type Prisma } from "@prisma/client";

function requireWorkspaceId(): string {
  const id = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!id) {
    console.error("Set OUTBOUND_WORKSPACE_RESTAURANT_ID in .env.local");
    process.exit(1);
  }
  return id;
}

const workspaceId = requireWorkspaceId();
const batchSize = Math.max(20, Number(process.env.LEAD_ENGINE_BACKFILL_BATCH?.trim() || "200") || 200);
const concurrency = Math.max(1, Math.min(12, Number(process.env.LEAD_ENGINE_BACKFILL_CONCURRENCY?.trim() || "6") || 6));
const delayMs = Math.max(0, Number(process.env.LEAD_ENGINE_BACKFILL_DELAY_MS?.trim() || "50") || 50);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pendingWhere(): Prisma.LeadProspectWhereInput {
  const base = platformFoundWhere(workspaceId);
  const force = process.env.LEAD_ENGINE_RESCAN?.trim() === "1";
  return {
    ...base,
    status: { not: LeadProspectStatus.ARCHIVED },
    ...(force ? {} : { enrichmentSource: null }),
  };
}

function toPlatformLead(row: {
  canonicalKey: string;
  name: string;
  city: string;
  country: string;
  deliveryPlatforms: string[];
  platformRank: number | null;
  platformRankPercentile: number | null;
  platformRegion: string | null;
  platformMenuUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
}): MergedPlatformLead {
  const menu = row.platformMenuUrl;
  return {
    canonicalKey: row.canonicalKey,
    name: row.name,
    city: row.city,
    country: row.country as "GB" | "IE",
    deliveryPlatforms: row.deliveryPlatforms as MergedPlatformLead["deliveryPlatforms"],
    platformRank: row.platformRank ?? 999,
    platformRankPercentile: row.platformRankPercentile ?? 1,
    platformRegion: row.platformRegion ?? row.city,
    platformRating: row.rating,
    platformReviewCount: row.reviewCount,
    platformUrl: menu,
    justEatMenuUrl:
      menu?.includes("just-eat") || row.deliveryPlatforms.includes("justeat") ? menu : null,
    deliverooMenuUrl:
      menu?.includes("deliveroo") || row.deliveryPlatforms.includes("deliveroo") ? menu : null,
    uberEatsMenuUrl:
      menu?.includes("ubereats") || row.deliveryPlatforms.includes("ubereats") ? menu : null,
    address: null,
  };
}

async function pendingCount() {
  return prisma.leadProspect.count({ where: pendingWhere() });
}

async function scanRow(row: {
  id: string;
  canonicalKey: string;
  name: string;
  city: string;
  country: string;
  deliveryPlatforms: string[];
  platformRank: number | null;
  platformRankPercentile: number | null;
  platformRegion: string | null;
  platformMenuUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}) {
  const lead = toPlatformLead(row);
  const isRescan = process.env.LEAD_ENGINE_RESCAN?.trim() === "1";
  try {
    const result = await scanLeadContacts(lead);

    let contactEmail = result.contactEmail;
    let contactPhone = result.contactPhone;
    let websiteUrl = result.websiteUrl;
    if (isRescan) {
      if (!contactEmail && row.contactEmail) {
        contactEmail = row.contactEmail;
        websiteUrl = row.websiteUrl ?? websiteUrl;
      }
      if (!contactPhone && row.contactPhone) contactPhone = row.contactPhone;
      if (!websiteUrl && row.websiteUrl) websiteUrl = row.websiteUrl;
    }
    const bestReviewCount = Math.max(
      row.reviewCount ?? 0,
      result.googleReviewCount ?? 0,
      lead.platformReviewCount ?? 0,
    );
    const bestRating = result.googleRating ?? row.rating;
    const ratingBand =
      bestRating != null && bestRating < 4.2 ? ("ideal" as const) : ("low" as const);
    const score = computeKobOpportunityScore({
      reviewCount: bestReviewCount > 0 ? bestReviewCount : row.reviewCount,
      rating: bestRating,
      ratingBand,
      instagramFollowers: null,
      instagramPostGapDays: null,
      hasTikTok: false,
      weakWebsite: false,
      websiteStale: false,
      weakPhotography: false,
      hasEmailCapture: false,
      hasGoogleBusinessPosts: false,
      instagramFollowersKnown: false,
      locationCount: null,
      platformRankPercentile: lead.platformRankPercentile,
    });

    await prisma.leadProspect.update({
      where: { id: row.id },
      data: {
        websiteUrl,
        contactPhone,
        contactEmail,
        enrichmentSource: contactEmail
          ? result.contactEmail
            ? result.enrichmentSource
            : "scrape"
          : result.enrichmentSource,
        platformMenuUrl: result.platformMenuUrl ?? row.platformMenuUrl,
        placeId: result.placeId ?? undefined,
        formattedAddress: result.formattedAddress ?? undefined,
        rating: bestRating ?? undefined,
        reviewCount: bestReviewCount > 0 ? bestReviewCount : undefined,
        kobOpportunityScore: score.total,
        scoreBreakdown: score.breakdown,
        opportunities: score.opportunities,
        disqualifiers: score.disqualifiers,
      },
    });

    return {
      ok: true as const,
      email: Boolean(contactEmail),
      name: row.name,
      city: row.city,
      tag: contactEmail || websiteUrl || result.enrichmentSource,
    };
  } catch (e) {
    await prisma.leadProspect.update({
      where: { id: row.id },
      data: { enrichmentSource: "scanned_no_site" },
    });
    return { ok: false as const, email: false, name: row.name, city: row.city, tag: e instanceof Error ? e.message : "error" };
  }
}

async function main() {
  process.env.LEAD_ENGINE_FAST_ENRICH = process.env.LEAD_ENGINE_FAST_ENRICH ?? "1";
  process.env.LEAD_ENGINE_USE_BROWSER = process.env.LEAD_ENGINE_USE_BROWSER ?? "0";
  process.env.LEAD_ENGINE_DISABLE_BROWSER = "1";

  const totalOnList = await prisma.leadProspect.count({ where: platformFoundWhere(workspaceId) });
  let pending = await pendingCount();
  let scanned = 0;
  let emailsFound = 0;

  console.log(`Full site scan → ${totalOnList} on list, ${pending} not yet scanned`);
  console.log(`Resolution: platform → Google Places → web search → domain guess. Concurrency ${concurrency}.`);

  while (pending > 0) {
    const rows = await prisma.leadProspect.findMany({
      where: pendingWhere(),
      orderBy: { createdAt: "asc" },
      take: batchSize,
      select: {
        id: true,
        canonicalKey: true,
        name: true,
        city: true,
        country: true,
        deliveryPlatforms: true,
        platformRank: true,
        platformRankPercentile: true,
        platformRegion: true,
        platformMenuUrl: true,
        rating: true,
        reviewCount: true,
        websiteUrl: true,
        contactEmail: true,
        contactPhone: true,
      },
    });

    if (!rows.length) break;

    for (let i = 0; i < rows.length; i += concurrency) {
      const chunk = rows.slice(i, i + concurrency);
      const results = await Promise.all(chunk.map((row) => scanRow(row)));
      for (const r of results) {
        scanned++;
        if (r.email) emailsFound++;
        if (r.email) console.log(`  ✓ ${r.name} (${r.city}) — ${r.tag}`);
      }
      if (delayMs) await sleep(delayMs);
    }

    pending = await pendingCount();
    const withEmail = await prisma.leadProspect.count({
      where: { ...platformFoundWhere(workspaceId), contactEmail: { not: null } },
    });
    console.log(`Progress: scanned ${scanned}/${totalOnList} · emails ${withEmail} · pending ${pending}`);
    if (scanned % 500 === 0) await prisma.$disconnect();
  }

  const withEmail = await prisma.leadProspect.count({
    where: { ...platformFoundWhere(workspaceId), contactEmail: { not: null } },
  });
  const qualified = await prisma.leadProspect.count({ where: platformQualifiedWhere(workspaceId) });
  console.log(`\nDone. Scanned ${scanned} sites. Emails on file: ${withEmail}. Email or phone: ${qualified}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
