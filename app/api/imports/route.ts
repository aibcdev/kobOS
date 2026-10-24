import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { IMPORT_CREATED_EVENT } from "@/inngest/imports";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { importView } from "@/lib/hub/imports/access";
import { createImport, ImportError, MAX_IMPORT_BYTES } from "@/lib/hub/imports/pipeline";
import { isSameOrigin } from "@/lib/security/same-origin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const restaurantId = new URL(req.url).searchParams.get("restaurantId") ?? "";
  if (!restaurantId || !(await assertRestaurantMembership(session.userId, restaurantId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const jobs = await prisma.importJob.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ imports: jobs.map(importView) });
}

/** multipart/form-data: restaurantId, file. */
export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMPORT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Files up to 20 MB, please" }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const restaurantId = form?.get("restaurantId");
  const file = form?.get("file");
  if (typeof restaurantId !== "string" || !(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 422 });
  if (!(await assertRestaurantMembership(session.userId, restaurantId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { job, duplicate } = await createImport({
      restaurantId,
      filename: file.name,
      contentType: file.type,
      body: Buffer.from(await file.arrayBuffer()),
      origin: "UPLOAD",
    });
    if (!duplicate || job.status === "PENDING") await inngest.send({ name: IMPORT_CREATED_EVENT, data: { importJobId: job.id } });
    return NextResponse.json({ import: importView(job), duplicate }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "TOO_LARGE" ? 413 : 422 });
    throw e;
  }
}
