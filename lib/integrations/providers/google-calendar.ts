import type { Integration } from "@prisma/client";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { prisma } from "@/lib/db/prisma";

export type CalendarEventSnapshot = {
  title: string;
  start: string; // ISO
  end: string | null;
  allDay: boolean;
};

/**
 * Fetch the next 7 days of events from the owner's primary Google Calendar
 * and store them as a lightweight snapshot on Integration.metadata.
 */
export async function syncGoogleCalendarEvents(restaurantId: string, integration: Integration): Promise<number> {
  const { accessToken } = decryptIntegrationToken(integration);
  if (!accessToken) return 0;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: weekAhead.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "25",
    });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return 0;

    const data = (await res.json()) as {
      items?: {
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }[];
    };

    const events: CalendarEventSnapshot[] = (data.items ?? [])
      .filter((e) => e.summary && (e.start?.dateTime || e.start?.date))
      .map((e) => ({
        title: (e.summary ?? "").slice(0, 120),
        start: e.start?.dateTime ?? `${e.start?.date}T00:00:00Z`,
        end: e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00Z` : null),
        allDay: Boolean(e.start?.date && !e.start?.dateTime),
      }));

    const existing = (integration.metadata ?? {}) as Record<string, unknown>;
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        metadata: { ...existing, calendarEvents: events, calendarSyncedAt: new Date().toISOString() },
      },
    });
    return events.length;
  } catch {
    return 0;
  }
}

/** Read the cached calendar snapshot for a restaurant (no network call). */
export async function getCalendarSnapshot(restaurantId: string): Promise<CalendarEventSnapshot[]> {
  const integration = await prisma.integration.findFirst({
    where: { restaurantId, provider: "GOOGLE_CALENDAR" },
  });
  if (!integration) return [];
  const metadata = (integration.metadata ?? {}) as { calendarEvents?: CalendarEventSnapshot[] };
  return Array.isArray(metadata.calendarEvents) ? metadata.calendarEvents : [];
}
