import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  website: z.string().max(2048).nullable().optional(),
  googleBusinessUrl: z.string().max(2048).nullable().optional(),
});

export async function PATCH(req: Request) {
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let website: string | null | undefined = parsed.data.website;
  if (website?.trim()) {
    try {
      website = new URL(website.trim()).href;
    } catch {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 422 });
    }
  } else if (website === "") {
    website = null;
  }

  let googleBusinessUrl: string | null | undefined = parsed.data.googleBusinessUrl;
  if (googleBusinessUrl?.trim()) {
    try {
      googleBusinessUrl = new URL(googleBusinessUrl.trim()).href;
    } catch {
      return NextResponse.json({ error: "Invalid Google Business URL" }, { status: 422 });
    }
  } else if (googleBusinessUrl === "") {
    googleBusinessUrl = null;
  }

  const updated = await prisma.restaurant.update({
    where: { id: parsed.data.restaurantId },
    data: {
      ...(website !== undefined ? { website } : {}),
      ...(googleBusinessUrl !== undefined ? { googleBusinessUrl } : {}),
    },
  });

  return NextResponse.json({ ok: true, restaurant: { id: updated.id, website: updated.website, googleBusinessUrl: updated.googleBusinessUrl } });
}
