import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

/** Refresh keyword rows from Search Console queries. */
export async function syncGscKeywords(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  const metadata = integration.metadata as { siteUrl?: string };
  const siteUrl = metadata.siteUrl;
  if (!accessToken || !siteUrl) return 0;

  try {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 28);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: ["query"],
          rowLimit: 25,
        }),
      },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      rows?: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
    };

    let synced = 0;
    for (const row of data.rows ?? []) {
      const keyword = row.keys?.[0];
      if (!keyword) continue;
      const existing = await prisma.keyword.findFirst({ where: { restaurantId, keyword } });
      if (existing) {
        await prisma.keyword.update({
          where: { id: existing.id },
          data: {
            ranking: Math.round(row.position ?? 50),
            searchVolume: row.impressions ?? 0,
          },
        });
      } else {
        await prisma.keyword.create({
          data: {
            restaurantId,
            keyword,
            ranking: Math.round(row.position ?? 50),
            searchVolume: row.impressions ?? 0,
            opportunityScore: Math.min(1, (row.clicks ?? 0) / 100),
          },
        });
      }
      synced++;
    }
    return synced;
  } catch {
    return 0;
  }
}
