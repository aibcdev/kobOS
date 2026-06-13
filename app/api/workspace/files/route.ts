import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { uploadWorkspaceFile } from "@/lib/workspace/upload-file";

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const form = await req.formData();
  const restaurantId = String(form.get("restaurantId") ?? "");
  const file = form.get("file");
  if (!restaurantId || !(file instanceof File)) {
    return NextResponse.json({ error: "restaurantId and file required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadWorkspaceFile({
    restaurantId,
    buffer,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 503 });
  return NextResponse.json({ ok: true, assetId: result.assetId, url: result.url }, { status: 201 });
}
