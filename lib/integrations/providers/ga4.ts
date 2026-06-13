import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

/** Pull GA4 page views into WebsiteEvent rows (proxy traffic). */
export async function syncGa4Traffic(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  const metadata = integration.metadata as { propertyId?: string };
  const propertyId = metadata.propertyId;
  if (!accessToken || !propertyId) return 0;

  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [{ name: "screenPageViews" }],
          dimensions: [{ name: "date" }],
        }),
      },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
    };

    let synced = 0;
    for (const row of data.rows ?? []) {
      const views = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      if (views <= 0) continue;
      for (let i = 0; i < Math.min(views, 50); i++) {
        await prisma.websiteEvent.create({
          data: { restaurantId, type: "CLICK", metadata: { source: "GA4" } },
        });
      }
      synced += views;
    }
    return synced;
  } catch {
    return 0;
  }
}
