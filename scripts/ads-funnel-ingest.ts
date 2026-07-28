/**
 * Ingest downloads/outbound/ads-funnel-snapshot.json into MarketingFunnelEvent.
 * Run after: python ads/funnel_snapshot.py
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const file = resolve("downloads/outbound/ads-funnel-snapshot.json");
  const m = JSON.parse(readFileSync(file, "utf8")) as {
    clicks?: number;
    impressions?: number;
    costMicros?: number;
    campaignId?: string;
  };
  const p = new PrismaClient();
  await p.marketingFunnelEvent.create({
    data: {
      kind: "AD_METRICS_SNAPSHOT",
      source: "google",
      medium: "cpc",
      campaign: "kob_b2b_audit",
      metrics: m,
    },
  });
  console.log(
    `ingested AD_METRICS_SNAPSHOT clicks=${m.clicks ?? 0} impressions=${m.impressions ?? 0}`,
  );
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
