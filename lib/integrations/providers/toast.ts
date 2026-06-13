import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

/**
 * Sync recent Toast orders into SalesSnapshot. Connected via a manual API key
 * (Toast has no self-serve OAuth). Mirrors the Square sync shape.
 * Restaurant GUID can be stored on integration.metadata.toastRestaurantGuid.
 */
export async function syncToastSales(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  if (!accessToken) return 0;

  const metadata = (integration.metadata ?? {}) as { toastRestaurantGuid?: string };
  const base = process.env.TOAST_API_BASE ?? "https://ws-api.toasttab.com";
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);

  try {
    const params = new URLSearchParams({
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      pageSize: "100",
    });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    if (metadata.toastRestaurantGuid) {
      headers["Toast-Restaurant-External-ID"] = metadata.toastRestaurantGuid;
    }

    const res = await fetch(`${base}/orders/v2/ordersBulk?${params.toString()}`, { headers });
    if (!res.ok) return 0;

    const orders = (await res.json()) as {
      openedDate?: string;
      checks?: { totalAmount?: number }[];
      voided?: boolean;
    }[];
    if (!Array.isArray(orders)) return 0;

    const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
    for (const order of orders) {
      if (!order.openedDate || order.voided) continue;
      const d = new Date(order.openedDate);
      const dateKey = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
      // Toast amounts are decimal currency units
      const totalCents = Math.round(
        (order.checks ?? []).reduce((sum, c) => sum + (c.totalAmount ?? 0), 0) * 100,
      );
      const entry = byDay.get(dateKey) ?? { revenueCents: 0, orderCount: 0 };
      entry.revenueCents += totalCents;
      entry.orderCount += 1;
      byDay.set(dateKey, entry);
    }

    let synced = 0;
    for (const [dateStr, agg] of byDay) {
      const date = new Date(dateStr);
      await prisma.salesSnapshot.upsert({
        where: { restaurantId_date_source: { restaurantId, date, source: "TOAST" } },
        create: {
          restaurantId,
          date,
          revenueCents: agg.revenueCents,
          orderCount: agg.orderCount,
          source: "TOAST",
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
