import { createHash } from "node:crypto";
import type { ImageCandidateUrl } from "@/lib/audit/analyze-url";
import type { MediaAssetMetaV1 } from "@/lib/audit/evidence-pack";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES_PER_IMAGE = Math.floor(2.5 * 1024 * 1024);
const MAX_TOTAL_BYTES = Math.floor(8 * 1024 * 1024);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type FetchedMediaForVision = {
  meta: MediaAssetMetaV1;
  /** Base64 for Gemini inlineData only; never persist. */
  base64: string;
};

function normalizeContentType(header: string | null): string | null {
  if (!header) return null;
  const main = header.split(";")[0]?.trim().toLowerCase();
  return main || null;
}

/**
 * Fetch up to `limit` images with byte + MIME caps. Returns metadata + base64 for model input.
 */
export async function fetchMediaAssetsForVision(
  candidates: ImageCandidateUrl[],
  limit = 5,
): Promise<{ assets: FetchedMediaForVision[]; errors: string[] }> {
  const errors: string[] = [];
  const assets: FetchedMediaForVision[] = [];
  let totalBytes = 0;

  const slice = candidates.slice(0, limit);
  for (const c of slice) {
    if (totalBytes >= MAX_TOTAL_BYTES) break;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(c.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.1",
          "User-Agent": "KOB-VisibilityAudit/1.0 (+https://kob.example; contact@kob.example)",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        errors.push(`${c.ref}: HTTP ${res.status}`);
        continue;
      }

      const ct = normalizeContentType(res.headers.get("content-type"));
      if (!ct || !ALLOWED_MIME.has(ct)) {
        errors.push(`${c.ref}: disallowed or missing MIME (${ct ?? "none"})`);
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES_PER_IMAGE) {
        errors.push(`${c.ref}: exceeds ${MAX_BYTES_PER_IMAGE} bytes`);
        continue;
      }
      if (totalBytes + buf.length > MAX_TOTAL_BYTES) {
        errors.push(`${c.ref}: would exceed total byte budget`);
        break;
      }

      const sha256 = createHash("sha256").update(buf).digest("hex");
      totalBytes += buf.length;

      assets.push({
        meta: {
          ref: c.ref,
          url: c.url,
          source: c.source,
          mimeType: ct,
          byteLength: buf.length,
          sha256,
        },
        base64: buf.toString("base64"),
      });
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : "fetch failed";
      errors.push(`${c.ref}: ${msg}`);
    }
  }

  return { assets, errors };
}
