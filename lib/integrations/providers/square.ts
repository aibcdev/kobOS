import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

/** Sync recent Square orders into SalesSnapshot. Requires SQUARE_ACCESS_TOKEN in integration. */
export async function syncSquareSales(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  if (!accessToken) return 0;

  const base = process.env.SQUARE_ENV === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);

  try {
    const res = await fetch(`${base}/v2/orders/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-12-18",
      },
      body: JSON.stringify({
        query: {
          filter: {
            date_time_filter: {
              created_at: { start_at: since.toISOString() },
            },
          },
        },
        limit: 100,
      }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      orders?: { created_at?: string; total_money?: { amount?: number } }[];
    };

    const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
    for (const order of data.orders ?? []) {
      if (!order.created_at) continue;
      const d = new Date(order.created_at);
      const dateKey = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
      const entry = byDay.get(dateKey) ?? { revenueCents: 0, orderCount: 0 };
      entry.revenueCents += order.total_money?.amount ?? 0;
      entry.orderCount += 1;
      byDay.set(dateKey, entry);
    }

    let synced = 0;
    for (const [dateStr, agg] of byDay) {
      const date = new Date(dateStr);
      await prisma.salesSnapshot.upsert({
        where: { restaurantId_date_source: { restaurantId, date, source: "SQUARE" } },
        create: {
          restaurantId,
          date,
          revenueCents: agg.revenueCents,
          orderCount: agg.orderCount,
          source: "SQUARE",
        },
        update: { revenueCents: agg.revenueCents, orderCount: agg.orderCount },
      });
      synced++;
    }
    return synced;
  } catch {
    return 0;
  }
}
