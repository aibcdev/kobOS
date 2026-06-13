import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

export type GmailSnapshot = {
  unreadCount: number;
  recentSenders: { from: string; subject: string }[];
  syncedAt: string;
};

/**
 * Read-only Gmail snapshot: unread count + senders/subjects from the last 24h.
 * Stored on Integration.metadata — no message bodies are fetched or kept.
 */
export async function syncGmailSnapshot(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  if (!accessToken) return 0;

  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:1d&maxResults=10",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) return 0;
    const list = (await listRes.json()) as { messages?: { id: string }[]; resultSizeEstimate?: number };

    const recentSenders: { from: string; subject: string }[] = [];
    for (const msg of (list.messages ?? []).slice(0, 5)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!msgRes.ok) continue;
      const detail = (await msgRes.json()) as { payload?: { headers?: { name: string; value: string }[] } };
      const headers = detail.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      if (from) recentSenders.push({ from: from.slice(0, 120), subject: subject.slice(0, 160) });
    }

    const snapshot: GmailSnapshot = {
      unreadCount: list.resultSizeEstimate ?? recentSenders.length,
      recentSenders,
      syncedAt: new Date().toISOString(),
    };

    const existing = (integration.metadata ?? {}) as Record<string, unknown>;
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        metadata: { ...existing, gmail: snapshot },
      },
    });
    return snapshot.unreadCount;
  } catch {
    return 0;
  }
}

/** Read the cached Gmail snapshot for a restaurant (no network call). */
export async function getGmailSnapshot(restaurantId: string): Promise<GmailSnapshot | null> {
  const integration = await prisma.integration.findFirst({
    where: { restaurantId, provider: "GMAIL" },
  });
  if (!integration) return null;
  const metadata = (integration.metadata ?? {}) as { gmail?: GmailSnapshot };
  return metadata.gmail ?? null;
}
