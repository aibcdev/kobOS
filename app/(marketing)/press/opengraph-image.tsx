import { SHARE_SIZE, shareImage } from "@/lib/seo/share-image";

export const alt = "KOB facts for writers and journalists";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage("For writers and journalists", "Facts, price and listing text");
}
