import { getOutboundIcpConfig } from "@/lib/outbound/icp-config";

/** Pick one UK city per calendar day (stable rotation). */
export function pickUkCityForDate(date = new Date()): string {
  const { ukCities } = getOutboundIcpConfig();
  if (ukCities.length === 1) return ukCities[0]!;

  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return ukCities[dayOfYear % ukCities.length]!;
}
