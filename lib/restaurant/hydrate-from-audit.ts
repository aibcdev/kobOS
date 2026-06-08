import { ReviewSource } from "@prisma/client";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";

function isLikelyUk(city: string | null | undefined): boolean {
  if (!city?.trim()) return process.env.PLACES_AUTOCOMPLETE_REGIONS?.trim().toUpperCase() === "GB";
  const c = city.toLowerCase();
  return (
    c.includes("uk") ||
    c.includes("united kingdom") ||
    c.includes("london") ||
    c.includes("manchester") ||
    c.includes("birmingham") ||
    c.includes("leeds") ||
    c.includes("glasgow") ||
    c.includes("edinburgh") ||
    c.includes("bristol") ||
    c.includes("liverpool")
  );
}

function googleBusinessUrlFromPayload(raw: unknown): string | null {
  const payload = parseAuditPayload(raw);
  const fromSocial = payload?.evidencePack?.userSocial?.googleBusinessUrl?.trim();
  if (fromSocial) return fromSocial;
  return null;
}

/** Copy audit intelligence onto Restaurant + seed reviews from Google Places evidence. */
export async function hydrateRestaurantFromLinkedAudit(restaurantId: string): Promise<boolean> {
  const audit = await prisma.visibilityAudit.findFirst({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
  });
  if (!audit) return false;

  const payload = parseAuditPayload(audit.resultPayload);
  const gbpUrl = googleBusinessUrlFromPayload(audit.resultPayload);
  const website = audit.websiteUrl?.trim() || undefined;

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return false;

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      city: restaurant.city?.trim() ? restaurant.city : audit.city?.trim() || undefined,
      website: restaurant.website?.trim() ? restaurant.website : website,
      googleBusinessUrl: restaurant.googleBusinessUrl?.trim() ? restaurant.googleBusinessUrl : gbpUrl || undefined,
      timezone: isLikelyUk(restaurant.city ?? audit.city) ? "Europe/London" : restaurant.timezone,
    },
  });

  const gp = payload?.evidencePack?.googlePlace;
  if (gp?.reviews?.length) {
    const existing = await prisma.customerReview.count({ where: { restaurantId } });
    if (existing === 0) {
      for (const [i, r] of gp.reviews.slice(0, 8).entries()) {
        const extId = `audit-${audit.id}-${i}`;
        await prisma.customerReview.upsert({
          where: { source_externalReviewId: { source: ReviewSource.GOOGLE, externalReviewId: extId } },
          create: {
            restaurantId,
            source: ReviewSource.GOOGLE,
            externalReviewId: extId,
            reviewerName: "Google guest",
            rating: Math.min(5, Math.max(1, Math.round(r.rating))),
            body: r.text.slice(0, 2000),
            reviewedAt: r.publishTime ? new Date(r.publishTime) : null,
          },
          update: {},
        });
      }
    }
  }

  return true;
}

/** Link the latest unlocked audit for this email to a new restaurant. */
export async function linkLatestAuditForEmail(restaurantId: string, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const audit = await prisma.visibilityAudit.findFirst({
    where: {
      leadEmail: { equals: normalized, mode: "insensitive" },
      restaurantId: null,
    },
    orderBy: { leadCapturedAt: "desc" },
  });
  if (!audit) return null;

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: { restaurantId },
  });

  await hydrateRestaurantFromLinkedAudit(restaurantId);
  return audit.id;
}
