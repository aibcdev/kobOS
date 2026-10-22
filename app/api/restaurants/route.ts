import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { countryFromHeaders, regionFromRequestHeaders } from "@/lib/billing/regional-pricing";
import { recordTrialStarted, startTrial } from "@/lib/billing/trial";
import { prisma } from "@/lib/db/prisma";
import { localeForCountry, normalizeCountryCode, resolveRestaurantTimezone } from "@/lib/geo/timezone";
import { linkAuditToRestaurant, linkLatestAuditForEmail } from "@/lib/restaurant/hydrate-from-audit";
import { slugify } from "@/lib/utils/slugify";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
    .optional(),
  cuisineType: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  /** Owner's browser zone; only used when Places/geo can't decide. */
  timezone: z.string().max(80).optional(),
  /** From Places `addressComponents` when the owner picked their listing. */
  countryCode: z.string().max(8).optional().nullable(),
  utcOffsetMinutes: z.number().int().min(-840).max(840).optional().nullable(),
  website: z.string().max(2048).optional(),
  /** Audit id or slug from signup (?audit=) so the same 3 wins show on the dashboard. */
  auditId: z.string().min(2).max(120).optional(),
});

export async function GET() {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const members = await prisma.teamMember.findMany({
    where: { userId: session.userId },
    include: { restaurant: true },
  });

  return NextResponse.json({ restaurants: members.map((m) => m.restaurant) });
}

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const slug = slugify(parsed.data.slug ?? parsed.data.name);
  let websiteUrl: string | undefined;
  if (parsed.data.website?.trim()) {
    try {
      websiteUrl = new URL(parsed.data.website.trim()).href;
    } catch {
      return NextResponse.json({ error: { website: ["Invalid URL"] } }, { status: 422 });
    }
  }

  const countryCode =
    normalizeCountryCode(parsed.data.countryCode) ??
    normalizeCountryCode(countryFromHeaders(req.headers)) ??
    (regionFromRequestHeaders(req.headers) === "GB" ? "GB" : null);
  const timezone = resolveRestaurantTimezone({
    countryCode,
    state: parsed.data.state,
    utcOffsetMinutes: parsed.data.utcOffsetMinutes,
    browserTimezone: parsed.data.timezone,
  });

  try {
    const restaurant = await prisma.$transaction(async (tx) => {
      const exists = await tx.restaurant.findUnique({ where: { slug } });
      const finalSlug = exists ? `${slug}-${Date.now().toString(36)}` : slug;

      const created = await tx.restaurant.create({
        data: {
          name: parsed.data.name.trim(),
          slug: finalSlug,
          cuisineType: parsed.data.cuisineType ?? undefined,
          city: parsed.data.city ?? undefined,
          state: parsed.data.state ?? undefined,
          timezone: timezone ?? undefined,
          countryCode,
          locale: localeForCountry(countryCode),
          website: websiteUrl,
          subscriptionPlan: SubscriptionPlan.FREE,
        },
      });

      await tx.teamMember.create({
        data: {
          userId: session.userId,
          restaurantId: created.id,
          role: "OWNER",
        },
      });
      // The 7-day free trial starts here, on the restaurant, with no card (one per account).
      const trialEndsAt = await startTrial(tx, created.id, session.userId);

      return { ...created, ...(trialEndsAt ? { subscriptionPlan: "TRIAL" as const, billingStatus: "TRIALING" as const, trialEndsAt } : {}) };
    });

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    if (parsed.data.auditId?.trim()) {
      await linkAuditToRestaurant(restaurant.id, parsed.data.auditId.trim());
    } else if (user?.email) {
      await linkLatestAuditForEmail(restaurant.id, user.email);
    }

    if (restaurant.billingStatus === "TRIALING") void recordTrialStarted(restaurant.id).catch((e) => console.warn("[restaurants] funnel", e));
    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create restaurant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
