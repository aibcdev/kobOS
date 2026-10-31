import { SHARE_SIZE, shareImage } from "@/lib/seo/share-image";

export const alt = "Review reply time calculator for restaurants, a free KOB tool";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage("Review reply time calculator", "A free tool for restaurant owners");
}
