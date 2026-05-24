import { cache } from "react";

import { mergeHomepageContent } from "@/lib/homepage-merge";
import { client } from "@/sanity/lib/client";

import { HOMEPAGE_QUERY } from "./homepage-query";

export const getHomepageContent = cache(async () => {
  try {
    const raw = await client.fetch(HOMEPAGE_QUERY);
    return mergeHomepageContent(raw);
  } catch {
    return mergeHomepageContent(null);
  }
});
