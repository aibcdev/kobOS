import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(50).optional().default(8),
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Phase 4 scaffold — public “Deals Near You” feed by GPS.
 * Only LIVE offers with coordinates are returned.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    lat: sp.get("lat"),
    lng: sp.get("lng"),
    radiusKm: sp.get("radiusKm") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 422 });
  }

  const { lat, lng, radiusKm } = parsed.data;
  const offers = await prisma.liveOffer.findMany({
    where: {
      status: "LIVE",
      lat: { not: null },
      lng: { not: null },
      validFrom: { lte: new Date() },
      validTo: { gte: new Date() },
    },
    take: 80,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      discountLabel: true,
      validFrom: true,
      validTo: true,
      lat: true,
      lng: true,
      restaurant: { select: { id: true, name: true, city: true } },
    },
  });

  const nearby = offers
    .filter((o) => o.lat != null && o.lng != null)
    .map((o) => ({
      ...o,
      distanceKm: haversineKm({ lat, lng }, { lat: o.lat!, lng: o.lng! }),
    }))
    .filter((o) => o.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 30)
    .map((o) => ({
      id: o.id,
      title: o.title,
      discountLabel: o.discountLabel,
      validFrom: o.validFrom.toISOString(),
      validTo: o.validTo.toISOString(),
      distanceKm: Math.round(o.distanceKm * 10) / 10,
      restaurant: o.restaurant,
    }));

  return NextResponse.json({
    deals: nearby,
    meta: { lat, lng, radiusKm, count: nearby.length },
  });
}
