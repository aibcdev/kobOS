import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { importView, loadImportForUser } from "@/lib/hub/imports/access";
import { deleteImport } from "@/lib/hub/imports/pipeline";
import { isSameOrigin } from "@/lib/security/same-origin";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const found = await loadImportForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ import: importView(found.job) });
}

/** Undo an import: removes its orders, bookings and consents, and the stored file. Owners and admins only. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadImportForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.member.role !== "OWNER" && found.member.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can undo an import" }, { status: 403 });
  }
  if (found.job.status === "PARSING") return NextResponse.json({ error: "Still importing; try again in a minute" }, { status: 409 });
  await deleteImport(found.job.id);
  return NextResponse.json({ deleted: true });
}
