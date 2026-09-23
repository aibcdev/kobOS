import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sameOrigin, talkAccess } from "@/lib/kob/talk/access";
import { isTalkProvider } from "@/lib/kob/talk/types";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    const { provider } = await ctx.params;
    if (!isTalkProvider(provider))
      return NextResponse.json(
        { error: "Unknown connection." },
        { status: 404 },
      );
    const restaurantId =
      new URL(req.url).searchParams.get("restaurantId") ?? "";
    const access = await talkAccess(restaurantId);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    await prisma.integration.deleteMany({ where: { restaurantId, provider } });
    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't disconnect. Please retry." },
      { status: 503 },
    );
  }
}
