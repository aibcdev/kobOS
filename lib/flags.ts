import { prisma } from "@/lib/db/prisma";

/**
 * Features gated on external approval or rollout. Env sets the default (`1`/`true` = on); a
 * `FeatureFlagOverride` row for a restaurant wins over the env. All default off in production until approved
 * (see docs/setup/EXTERNAL-ACCESS.md).
 */
export const FLAGS = [
  "GBP_LIVE",
  "WHATSAPP_LIVE",
  "INSTAGRAM_PUBLISH_LIVE",
  "GMAIL_ENABLED",
  "PROACTIVE_ENABLED",
  "GUEST_INBOX_ENABLED",
  "CREATIVES_ENABLED",
  "STREAMING_TALK",
  "SQUARE_LIVE",
  "TOAST_LIVE",
  "EPOS_NOW_LIVE",
  "ZETTLE_LIVE",
  "CLOVER_LIVE",
] as const;

export type FlagName = (typeof FLAGS)[number];

export function flagDefault(name: FlagName): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true";
}

export async function flag(name: FlagName, restaurantId?: string | null): Promise<boolean> {
  if (restaurantId) {
    try {
      const override = await prisma.featureFlagOverride.findUnique({
        where: { restaurantId_name: { restaurantId, name } },
        select: { enabled: true },
      });
      if (override) return override.enabled;
    } catch (err) {
      console.warn(`[flags] override lookup failed for ${name}`, err instanceof Error ? err.message : err);
    }
  }
  return flagDefault(name);
}
