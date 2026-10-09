import { headers } from "next/headers";
import { foundingPrice, regionFromRequestHeaders, type RegionalPrice } from "@/lib/billing/regional-pricing";

export async function getVisitorFoundingPrice(): Promise<RegionalPrice> {
  return foundingPrice(regionFromRequestHeaders(await headers()));
}
