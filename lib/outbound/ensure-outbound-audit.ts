import { createPendingAuditSeed } from "@/lib/audit/create-pending-audit";
import { normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";
import { verifyWebsiteMatchesRestaurant } from "@/lib/audit/website-identity";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";
import { slugify } from "@/lib/utils/slugify";

export type EnsureOutboundAuditInput = {
  restaurantName: string;
  city: string;
  websiteUrl: string;
  placeId?: string | null;
  formattedAddress?: string | null;
  contactEmail?: string | null;
  /** Reuse an existing audit if already linked. */
  existingAuditId?: string | null;
};

export type EnsureOutboundAuditResult = {
  auditId: string;
  slug: string;
  /** Public URL including optional ?email= prefill */
  auditUrl: string;
  created: boolean;
};

function publicOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://trykob.com";
  return raw.replace(/\/$/, "");
}

export function buildAuditPublicUrl(idOrSlug: string, contactEmail?: string | null): string {
  const base = `${publicOrigin()}/audit/${idOrSlug}`;
  const email = contactEmail?.trim();
  if (!email) return base;
  return `${base}?email=${encodeURIComponent(email)}`;
}

async function allocateAuditSlug(name: string, city: string): Promise<string> {
  // Drop apostrophes so "Ali's BBQ" → "alis-bbq" (not "ali-s-bbq")
  const base = slugify(name.replace(/['’]/g, ""));
  const cityPart = slugify(city.replace(/['’]/g, ""));
  const candidates = [
    base,
    cityPart && cityPart !== "your-area" ? `${base}-${cityPart}` : null,
    `${base}-${Math.random().toString(36).slice(2, 6)}`,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const existing = await prisma.visibilityAudit.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Create (or reuse) a VisibilityAudit for an outbound restaurant and queue the scan.
 * Public email links use the pretty **slug** (`/audit/restaurant-name`).
 * Refuses to attach a website that fails restaurant identity verification.
 */
export async function ensureOutboundAudit(
  input: EnsureOutboundAuditInput,
): Promise<EnsureOutboundAuditResult | { ok: false; error: string }> {
  const websiteUrl = normalizeAuditWebsiteUrl(input.websiteUrl);
  if (!websiteUrl) {
    return { ok: false as const, error: "invalid_website" };
  }

  const restaurantName = input.restaurantName.trim() || "Restaurant";
  const city = input.city.trim() || "Your area";

  const identity = await verifyWebsiteMatchesRestaurant({
    restaurantName,
    city,
    websiteUrl,
  });
  if (!identity.matched) {
    console.warn(
      `[ensureOutboundAudit] website_mismatch for ${restaurantName}: ${identity.reason} (${websiteUrl})`,
    );
    return { ok: false as const, error: "website_mismatch" };
  }

  if (input.existingAuditId?.trim()) {
    const existing = await prisma.visibilityAudit.findUnique({
      where: { id: input.existingAuditId.trim() },
      select: { id: true, slug: true, websiteUrl: true },
    });
    if (existing) {
      const existingUrl = existing.websiteUrl?.trim();
      if (existingUrl && existingUrl !== websiteUrl) {
        const existingIdentity = await verifyWebsiteMatchesRestaurant({
          restaurantName,
          city,
          websiteUrl: existingUrl,
        });
        if (!existingIdentity.matched) {
          return { ok: false as const, error: "website_mismatch" };
        }
      }
      const pathKey = existing.slug?.trim() || existing.id;
      return {
        auditId: existing.id,
        slug: pathKey,
        auditUrl: buildAuditPublicUrl(pathKey, input.contactEmail),
        created: false,
      };
    }
  }

  const slug = await allocateAuditSlug(restaurantName, city);
  const { row } = createPendingAuditSeed({ restaurantName, city, websiteUrl });

  const created = await prisma.visibilityAudit.create({
    data: {
      ...row,
      slug,
    },
  });

  try {
    await inngest.send({
      name: "audit/run.requested",
      data: {
        auditId: created.id,
        websiteUrl,
        siteScope: "one" as const,
        userSocial: null,
        userImageUrls: null,
        placeLat: null,
        placeLng: null,
        placeLabel: restaurantName,
        placePlaceId: input.placeId ?? null,
        placeFormattedAddress: input.formattedAddress ?? null,
      },
    });
  } catch (err) {
    console.warn("[ensureOutboundAudit] Inngest queue failed — starting inline scan", err);
    void import("@/lib/audit/execute-audit-pipeline")
      .then(({ executeAuditPipeline }) =>
        executeAuditPipeline(created.id, {
          websiteUrl,
          siteScope: "one",
          userSocial: null,
          userImageUrls: null,
          place: {
            name: restaurantName,
            placeId: input.placeId ?? undefined,
            formattedAddress: input.formattedAddress ?? undefined,
            lat: null,
            lng: null,
          },
        }),
      )
      .catch((e) => console.warn("[ensureOutboundAudit] inline scan failed", e));
  }

  return {
    auditId: created.id,
    slug,
    auditUrl: buildAuditPublicUrl(slug, input.contactEmail),
    created: true,
  };
}
