import { IntegrationProvider, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { integrationPublic } from "@/lib/api/safe-integration";
import { encryptSecret } from "@/lib/crypto/tokens";
import { prisma } from "@/lib/db/prisma";

const upsertSchema = z.object({
  restaurantId: z.string().min(15).max(64),
  provider: z.nativeEnum(IntegrationProvider),
  accessToken: z.string().min(4).optional(),
  refreshToken: z.string().min(4).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.integration.findMany({ where: { restaurantId }, orderBy: { connectedAt: "desc" } });

  return NextResponse.json({ integrations: rows.map(integrationPublic) });
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

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let encryptedAccessToken: string | undefined;
  let encryptedRefreshToken: string | undefined;
  try {
    if (parsed.data.accessToken?.trim()) {
      encryptedAccessToken = encryptSecret(parsed.data.accessToken.trim());
    }
    if (parsed.data.refreshToken?.trim()) {
      encryptedRefreshToken = encryptSecret(parsed.data.refreshToken.trim());
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Encryption unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const metadata = (parsed.data.metadata ?? {}) as Prisma.InputJsonValue;

  const row = await prisma.integration.upsert({
    where: {
      restaurantId_provider: {
        restaurantId: parsed.data.restaurantId,
        provider: parsed.data.provider,
      },
    },
    create: {
      restaurantId: parsed.data.restaurantId,
      provider: parsed.data.provider,
      encryptedAccessToken: encryptedAccessToken ?? null,
      encryptedRefreshToken: encryptedRefreshToken ?? null,
      metadata,
    },
    update: {
      ...(encryptedAccessToken !== undefined ? { encryptedAccessToken } : {}),
      ...(encryptedRefreshToken !== undefined ? { encryptedRefreshToken } : {}),
      metadata,
    },
  });

  return NextResponse.json({ integration: integrationPublic(row) }, { status: 201 });
}
