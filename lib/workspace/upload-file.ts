import { createClient } from "@supabase/supabase-js";
import type { AssetType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function uploadWorkspaceFile(args: {
  restaurantId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  assetType?: AssetType;
}): Promise<{ ok: true; assetId: string; url: string } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_AUDIT_BUCKET?.trim() || "kob-assets";
  if (!url || !key) {
    return { ok: false, error: "Storage not configured" };
  }

  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `workspace/${args.restaurantId}/${Date.now()}-${safeName}`;

  try {
    const client = createClient(url, key);
    const { error } = await client.storage.from(bucket).upload(path, args.buffer, {
      contentType: args.mimeType,
      upsert: false,
    });
    if (error) return { ok: false, error: error.message };

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    const asset = await prisma.asset.create({
      data: {
        restaurantId: args.restaurantId,
        type: args.assetType ?? "BRANDING",
        url: data.publicUrl,
        metadata: { filename: args.filename, path },
      },
    });

    return { ok: true, assetId: asset.id, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }
}
