export type DeliveryPlatform = "deliveroo" | "justeat" | "ubereats";

export type PlatformListing = {
  platform: DeliveryPlatform;
  platformId: string;
  name: string;
  city: string;
  country: "GB" | "IE";
  rank: number;
  totalInRegion: number;
  rankPercentile: number;
  platformRegion: string;
  rating: number | null;
  reviewCount: number | null;
  url: string | null;
  address: string | null;
  isBrand: boolean;
};
