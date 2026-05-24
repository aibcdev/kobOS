import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
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
  timezone: z.string().max(80).optional(),
  website: z.string().max(2048).optional(),
  subscriptionPlan: z.nativeEnum(SubscriptionPlan).optional(),
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
          timezone: parsed.data.timezone ?? undefined,
          website: websiteUrl,
          subscriptionPlan: parsed.data.subscriptionPlan ?? SubscriptionPlan.FREE,
        },
      });

      await tx.teamMember.create({
        data: {
          userId: session.userId,
          restaurantId: created.id,
          role: "OWNER",
        },
      });

      return created;
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create restaurant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
