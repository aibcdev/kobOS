/**
 * T-09 backfill: move UK restaurants off the America/Chicago column default.
 *
 * A restaurant counts as GB when `countryCode = 'GB'`, its website is on a .uk
 * domain, its city/state holds a UK postcode, or its linked audit geolocated it
 * inside Great Britain. We never stored the `kob_region` cookie, so those are
 * the only signals available.
 *
 *   npx tsx scripts/backfill-restaurant-locale.ts          # dry run
 *   npx tsx scripts/backfill-restaurant-locale.ts --apply
 */
import { prisma } from "../lib/db/prisma";

const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

/** Mainland GB + islands; west edge stops short of Ireland (Dublin is -6.26). */
function inGreatBritain(lat: number, lng: number): boolean {
  return lat >= 49.8 && lat <= 60.9 && lng >= -5.8 && lng <= 1.8;
}

function hostEndsWithUk(website: string | null): boolean {
  if (!website) return false;
  try {
    return new URL(website).hostname.toLowerCase().endsWith(".uk");
  } catch {
    return false;
  }
}

function auditGeo(payload: unknown): { lat: number; lng: number } | null {
  const geo = (payload as { geoLocation?: { lat?: unknown; lng?: unknown; source?: unknown } } | null)
    ?.geoLocation;
  if (!geo || geo.source === "default") return null;
  return typeof geo.lat === "number" && typeof geo.lng === "number" ? { lat: geo.lat, lng: geo.lng } : null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await prisma.restaurant.findMany({
    where: { OR: [{ countryCode: "GB" }, { countryCode: null }] },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      website: true,
      timezone: true,
      countryCode: true,
      locale: true,
      visibilityAudits: { select: { resultPayload: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  const targets = rows.filter((r) => {
    if (r.countryCode === "GB") return r.timezone !== "Europe/London" || r.locale !== "en-GB";
    if (r.timezone !== "America/Chicago") return false;
    if (hostEndsWithUk(r.website)) return true;
    if (UK_POSTCODE.test(`${r.city ?? ""} ${r.state ?? ""}`)) return true;
    return r.visibilityAudits.some((a) => {
      const g = auditGeo(a.resultPayload);
      return g ? inGreatBritain(g.lat, g.lng) : false;
    });
  });

  console.log(`${rows.length} candidates, ${targets.length} to set Europe/London${apply ? "" : " (dry run)"}`);
  for (const r of targets) console.log(`  ${r.id}  ${r.name}  (${r.city ?? "?"}, was ${r.timezone})`);

  if (apply && targets.length) {
    const res = await prisma.restaurant.updateMany({
      where: { id: { in: targets.map((r) => r.id) } },
      data: { timezone: "Europe/London", countryCode: "GB", locale: "en-GB" },
    });
    console.log(`updated ${res.count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
