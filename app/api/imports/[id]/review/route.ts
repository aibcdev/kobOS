import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { IMPORT_CREATED_EVENT } from "@/inngest/imports";
import { requireApiUser } from "@/lib/auth/api-session";
import { importView, loadImportForUser } from "@/lib/hub/imports/access";
import { approveEmailedImport } from "@/lib/hub/imports/pipeline";
import { isSameOrigin } from "@/lib/security/same-origin";

/** Owner or admin lets an emailed guest/bookings file in after seeing what it is. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadImportForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.member.role !== "OWNER" && found.member.role !== "ADMIN") return NextResponse.json({ error: "Only owners and admins can import emailed files" }, { status: 403 });
  if (found.job.status !== "NEEDS_REVIEW") return NextResponse.json({ error: "This import isn't waiting for review", import: importView(found.job) }, { status: 409 });

  const job = await approveEmailedImport(found.job.id, session.userId);
  await inngest.send({ name: IMPORT_CREATED_EVENT, data: { importJobId: job.id } });
  return NextResponse.json({ import: importView(job) });
}
