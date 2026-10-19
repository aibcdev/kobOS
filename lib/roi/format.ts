import { formatMinor } from "@/lib/commerce/money";
import type { StoredMetric } from "@/lib/roi/ledger";
import type { RoiUnit } from "@/lib/roi/metrics";

/** One formatter for the page, the click-through, the email and the print view, so the same number reads the same. */

export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function formatValue(value: number, unit: RoiUnit, currency: string, locale = "en-GB"): string {
  if (unit === "money") return formatMinor(value, currency, locale);
  if (unit === "minutes") return formatMinutes(value);
  return new Intl.NumberFormat(locale).format(value);
}

export function formatMetric(m: StoredMetric, currency: string, locale = "en-GB"): string | null {
  return m.state === "OFF" || m.value === null ? null : formatValue(m.value, m.unit, currency, locale);
}

/** "12 – 18 Oct 2026" for a week starting on `weekStart`. */
export function weekLabel(weekStart: string, locale = "en-GB"): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const day = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric" });
  const full = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return sameMonth ? `${day.format(start)} – ${full.format(end)}` : `${new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short" }).format(start)} – ${full.format(end)}`;
}
