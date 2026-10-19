import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { IMPORT_CREATED_EVENT } from "@/inngest/imports";
import { requireApiUser } from "@/lib/auth/api-session";
import { importView, loadImportForUser } from "@/lib/hub/imports/access";
import { saveMapping } from "@/lib/hub/imports/pipeline";
import { isSameOrigin } from "@/lib/security/same-origin";

const body = z.object({ mapping: z.record(z.string().max(40), z.string().max(200)) });

/** Owner chose which column is which; the import re-runs in the background. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadImportForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.job.status !== "NEEDS_MAPPING") return NextResponse.json({ error: "This import doesn't need mapping", import: importView(found.job) }, { status: 409 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid mapping" }, { status: 422 });
  const job = await saveMapping(found.job.id, parsed.data.mapping);
  await inngest.send({ name: IMPORT_CREATED_EVENT, data: { importJobId: job.id } });
  return NextResponse.json({ import: importView(job) });
}
