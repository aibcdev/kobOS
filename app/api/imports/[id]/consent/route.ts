import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { importView, loadImportForUser } from "@/lib/hub/imports/access";
import { attestImportConsent } from "@/lib/hub/imports/consent";
import { isSameOrigin } from "@/lib/security/same-origin";

const body = z.object({ field: z.string().max(40), channel: z.string().max(20), attest: z.literal(true) });

/** Owner confirms that one opt-in column is real consent to their marketing on one channel. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadImportForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Tick the statement to confirm." }, { status: 422 });
  const result = await attestImportConsent({ jobId: found.job.id, userId: session.userId, field: parsed.data.field, channel: parsed.data.channel });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ granted: result.granted, import: importView(await prisma.importJob.findUniqueOrThrow({ where: { id: found.job.id } })) });
}
