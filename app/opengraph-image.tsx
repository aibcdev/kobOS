import { SHARE_SIZE, shareImage } from "@/lib/seo/share-image";

export const alt = "KOB: every review answered, every listing right. You approve and post in one tap.";
// Keep in sync with DEFAULT_SHARE_IMAGE in lib/seo/page-metadata.ts.
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage("Every review answered. Every listing right. You approve and post in one tap.");
}
