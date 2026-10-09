"use client";

import { useSyncExternalStore } from "react";
import {
  foundingPrice,
  parsePriceRegion,
  PRICE_REGION_COOKIE,
  type PriceRegion,
  type RegionalPrice,
} from "@/lib/billing/regional-pricing";

function readRegion(): PriceRegion {
  const match = document.cookie.match(new RegExp(`(?:^|; )${PRICE_REGION_COOKIE}=([^;]*)`));
  return parsePriceRegion(match ? decodeURIComponent(match[1]) : null) ?? "US";
}

const subscribe = () => () => {};

export function useFoundingPrice(): RegionalPrice {
  const region = useSyncExternalStore(subscribe, readRegion, () => "US" as PriceRegion);
  return foundingPrice(region);
}
