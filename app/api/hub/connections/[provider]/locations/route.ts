import type { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { registerAllConnectors } from "@/lib/connectors";
import { prisma } from "@/lib/db/prisma";
import { authorizeConnectionChange } from "@/lib/hub/connection-auth";
import { connectorFor } from "@/lib/hub/connector";
import { connectorCtx } from "@/lib/hub/ctx";
import { locationIdsOf, MAX_LOCATIONS, saveLocationChoice } from "@/lib/hub/locations";

export const runtime = "nodejs";

async function load(provider: string, restaurantId: string) {
  registerAllConnectors();
  const connector = connectorFor(provider);
  if (!connector?.listLocations) return null;
  const integration = await prisma.integration.findUnique({ where: { restaurantId_provider: { restaurantId, provider: provider as IntegrationProvider } } });
  if (!integration || integration.status === "DISCONNECTED") return null;
  return { connector, integration, listLocations: connector.listLocations };
}

/** The provider's locations and which ones are this restaurant's. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const auth = await authorizeConnectionChange(req, new URL(req.url).searchParams.get("restaurantId"), { requireSameOrigin: false });
  if (!auth.ok) return auth.res;
  const found = await load(provider, auth.restaurantId);
  if (!found) return NextResponse.json({ error: "Not connected" }, { status: 404 });
  try {
    const locations = await found.listLocations(connectorCtx(found.integration));
    return NextResponse.json({ locations, selected: locationIdsOf(found.integration.metadata) ?? [] });
  } catch {
    return NextResponse.json({ error: "Couldn't load your locations. Please retry." }, { status: 502 });
  }
}

const body = z.object({ restaurantId: z.string(), locationIds: z.array(z.string().max(100)).min(1).max(MAX_LOCATIONS) });

/** Owner picks which locations belong to this restaurant; order sync resumes for those only. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `Pick between 1 and ${MAX_LOCATIONS} locations.` }, { status: 422 });
  const auth = await authorizeConnectionChange(req, parsed.data.restaurantId);
  if (!auth.ok) return auth.res;
  const found = await load(provider, auth.restaurantId);
  if (!found) return NextResponse.json({ error: "Not connected" }, { status: 404 });
  let known: Set<string>;
  try {
    known = new Set((await found.listLocations(connectorCtx(found.integration))).map((l) => l.externalId));
  } catch {
    return NextResponse.json({ error: "Couldn't check your locations. Please retry." }, { status: 502 });
  }
  if (!parsed.data.locationIds.every((id) => known.has(id))) return NextResponse.json({ error: "That location isn't on this account." }, { status: 422 });
  await saveLocationChoice(found.integration.id, parsed.data.locationIds);
  await inngest.send({ name: "hub/integration.connected", data: { integrationId: found.integration.id } }).catch(() => undefined);
  return NextResponse.json({ saved: true });
}
