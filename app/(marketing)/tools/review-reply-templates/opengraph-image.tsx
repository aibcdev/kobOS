import { SHARE_SIZE, shareImage } from "@/lib/seo/share-image";

export const alt = "Review reply picker for restaurants, a free KOB tool";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage("Pick a review, get a reply to adapt", "A free tool for restaurant owners");
}
