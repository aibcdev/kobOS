import { createClient } from "@supabase/supabase-js";

/**
 * Upload audit screenshot to Supabase Storage when service role + bucket are configured.
 * Returns public URL or null (fail-open for local/dev).
 */
export async function maybeUploadAuditScreenshotPng(
  buffer: Buffer,
  objectKeyBase: string,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_AUDIT_BUCKET?.trim() || "kob-assets";
  if (!url || !key) return null;

  const safeBase = objectKeyBase.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const path = `audits/${safeBase}/${Date.now()}.png`;

  try {
    const client = createClient(url, key);
    const { error } = await client.storage.from(bucket).upload(path, buffer, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) {
      console.warn("[audit-screenshot] upload failed", error.message);
      return null;
    }
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[audit-screenshot]", e);
    return null;
  }
}
