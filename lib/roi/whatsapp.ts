import { flag } from "@/lib/flags";
import { numberGuard } from "@/lib/roi/email";
import { formatMetric, weekLabel } from "@/lib/roi/format";
import type { WeekSnapshot } from "@/lib/roi/ledger";

/**
 * `kob_weekly_receipt` (utility category, submitted for Meta approval): "Your week at {{1}} ({{2}}): {{3}}. See every
 * number: {{4}}". Behind WHATSAPP_LIVE; nothing sends until Spec 1's WhatsApp channel exists.
 */
export const WEEKLY_RECEIPT_TEMPLATE = { name: "kob_weekly_receipt", language: "en_GB", params: 4 } as const;

export function weeklyReceiptParams(input: { restaurantName: string; snapshot: WeekSnapshot; locale: string; link: string }): string[] | null {
  const { snapshot: s, locale } = input;
  const sales = s.metrics.net_sales?.state === "LIVE" ? formatMetric(s.metrics.net_sales, s.currency, locale) : null;
  const jobs = s.metrics.kob_actions?.state === "LIVE" && s.metrics.kob_actions.count ? formatMetric(s.metrics.kob_actions, s.currency, locale) : null;
  const saved = s.metrics.time_saved?.state === "LIVE" && s.metrics.time_saved.count ? formatMetric(s.metrics.time_saved, s.currency, locale) : null;
  const parts = [sales && `${sales} in sales`, jobs && `${jobs} jobs done by KOB`, saved && `about ${saved} saved`].filter((p): p is string => Boolean(p));
  if (!parts.length) return null;
  const label = weekLabel(s.weekStart, locale);
  const summary = parts.join(", ");
  if (!numberGuard(summary, [sales, jobs, saved].filter((v): v is string => Boolean(v))).ok) return null;
  return [input.restaurantName, label, summary, input.link];
}

export async function whatsappReceiptStatus(restaurantId: string): Promise<"flag_off" | "no_channel"> {
  return (await flag("WHATSAPP_LIVE", restaurantId)) ? "no_channel" : "flag_off";
}
