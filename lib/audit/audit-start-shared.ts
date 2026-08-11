import { Prisma } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auditCityLabel, hostLabelFromUrl } from "@/lib/audit/derive-audit-labels";
import { cityFromFormattedAddress, createPendingAuditSeed } from "@/lib/audit/create-pending-audit";
import type { AuditUserSocialInput } from "@/lib/audit/evidence-pack";
import { normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";
import { checkAuditRunRateLimit, clientIpFromHeaders } from "@/lib/audit/rate-limit";
import { validateAuditRuntimeEnv } from "@/lib/audit/validate-audit-runtime";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";
import { isPaidGoogleAttribution } from "@/lib/marketing/attribution";
import {
  gbpPlaceholderWebsiteUrl,
  isGoogleMapsUrl,
  isNonWebsitePresenceUrl,
  resolveGoogleMapsUrlToPlace,
} from "@/lib/places/resolve-maps-url";

export const auditStartBodySchema = z
  .object({
    websiteUrl: z.string().trim().max(2048).optional().or(z.literal("")),
    siteScope: z.enum(["one", "multiple"]).default("one"),
    userImageUrls: z.array(z.string().trim().max(2048)).max(3).optional(),
    userSocial: z
      .object({
        instagram: z.string().trim().max(500).optional().or(z.literal("")),
        facebook: z.string().trim().max(500).optional().or(z.literal("")),
        tiktok: z.string().trim().max(500).optional().or(z.literal("")),
        googleBusinessUrl: z.string().trim().max(2048).optional().or(z.literal("")),
      })
      .optional(),
    place: z
      .object({
        placeId: z.string().trim().max(256).optional(),
        name: z.string().trim().max(200).optional(),
        formattedAddress: z.string().trim().max(500).optional(),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
      })
      .optional(),
    attribution: z
      .object({
        utmSource: z.string().trim().max(120).optional(),
        utmMedium: z.string().trim().max(120).optional(),
        utmCampaign: z.string().trim().max(200).optional(),
        gclid: z.string().trim().max(200).optional(),
        landingPath: z.string().trim().max(500).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasPlace = Boolean(data.place?.placeId?.trim() || data.place?.name?.trim());
    const hasUrl = Boolean(data.websiteUrl?.trim());
    if (!hasPlace && !hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a website URL or select your restaurant on Google.",
        path: ["websiteUrl"],
      });
    }
  });

function emptyToUndef(s: string | undefined) {
  const t = s?.trim();
  return t ? t : undefined;
}

export function parseAuditStartBody(body: unknown) {
  return auditStartBodySchema.safeParse(body);
}

export async function handleAuditStart(req: Request) {
  const rl = checkAuditRunRateLimit(clientIpFromHeaders(req.headers));
  if (!rl.ok) {
    return NextResponse.json(
      {
        code: "rate_limited",
        error: "Too many audits from this network. Try again later.",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseAuditStartBody(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const envCheck = validateAuditRuntimeEnv();
  if (!envCheck.ok) {
    return NextResponse.json(
      { code: envCheck.issue.code, error: envCheck.issue.error },
      { status: 503 },
    );
  }

  let place = parsed.data.place
    ? {
        placeId: parsed.data.place.placeId?.trim() || undefined,
        name: parsed.data.place.name?.trim() || undefined,
        formattedAddress: parsed.data.place.formattedAddress?.trim() || undefined,
        lat: parsed.data.place.lat ?? null,
        lng: parsed.data.place.lng ?? null,
      }
    : undefined;

  const rawWebsite = parsed.data.websiteUrl?.trim() || "";
  let websiteUrl = rawWebsite ? normalizeAuditWebsiteUrl(rawWebsite) : null;

  // Maps short links → resolve to Place (+ real websiteUri when Google has one)
  if (websiteUrl && isGoogleMapsUrl(websiteUrl) && !place?.placeId) {
    const resolved = await resolveGoogleMapsUrlToPlace(websiteUrl);
    if (resolved) {
      place = {
        placeId: resolved.placeId,
        name: resolved.name,
        formattedAddress: resolved.formattedAddress,
        lat: resolved.lat,
        lng: resolved.lng,
      };
      websiteUrl = resolved.websiteUri
        ? normalizeAuditWebsiteUrl(resolved.websiteUri)
        : gbpPlaceholderWebsiteUrl(resolved.placeId, resolved.name);
    }
  }

  // Presence-only URLs (IG/FB) without a place — reject as crawl targets
  if (websiteUrl && isNonWebsitePresenceUrl(websiteUrl) && !place?.placeId) {
    return NextResponse.json(
      {
        error:
          "That looks like a social or Maps link. Search for your restaurant on Google, or paste your real website.",
      },
      { status: 400 },
    );
  }

  // Place without website → GBP placeholder (reviews/listing-heavy audit)
  if (!websiteUrl && place?.placeId) {
    websiteUrl = gbpPlaceholderWebsiteUrl(place.placeId, place.name);
  }

  if (!websiteUrl) {
    return NextResponse.json(
      { error: "Enter a valid website URL, or find your restaurant on Google." },
      { status: 400 },
    );
  }

  // Never crawl maps.app.goo.gl as the site when we already have a place
  if (isGoogleMapsUrl(websiteUrl) && place?.placeId) {
    websiteUrl = gbpPlaceholderWebsiteUrl(place.placeId, place.name);
  }

  const restaurantName = place?.name?.trim() || hostLabelFromUrl(websiteUrl);
  const city = place?.formattedAddress?.trim()
    ? cityFromFormattedAddress(place.formattedAddress)
    : auditCityLabel(parsed.data.siteScope);

  const rawSocial = parsed.data.userSocial;
  let userSocial: AuditUserSocialInput | undefined =
    rawSocial &&
    (rawSocial.instagram || rawSocial.facebook || rawSocial.tiktok || rawSocial.googleBusinessUrl)
      ? {
          instagram: emptyToUndef(rawSocial.instagram),
          facebook: emptyToUndef(rawSocial.facebook),
          tiktok: emptyToUndef(rawSocial.tiktok),
          googleBusinessUrl: emptyToUndef(rawSocial.googleBusinessUrl),
        }
      : undefined;

  if (place?.placeId && !userSocial?.googleBusinessUrl) {
    userSocial = {
      ...(userSocial ?? {}),
      googleBusinessUrl: gbpPlaceholderWebsiteUrl(place.placeId, place.name),
    };
  }

  const userImageUrls =
    parsed.data.userImageUrls?.map((u) => u.trim()).filter(Boolean).slice(0, 3) ?? undefined;

  try {
    const { row } = createPendingAuditSeed({ restaurantName, city, websiteUrl });
    const attr = parsed.data.attribution;
    const created = await prisma.visibilityAudit.create({
      data: {
        ...row,
        utmSource: attr?.utmSource || null,
        utmMedium: attr?.utmMedium || null,
        utmCampaign: attr?.utmCampaign || null,
        gclid: attr?.gclid || null,
        landingPath: attr?.landingPath || null,
      },
    });

    if (isPaidGoogleAttribution(attr)) {
      void prisma.marketingFunnelEvent
        .create({
          data: {
            kind: "AUDIT_STARTED",
            source: attr?.utmSource || "google",
            medium: attr?.utmMedium || "cpc",
            campaign: attr?.utmCampaign || "kob_b2b_audit",
            gclid: attr?.gclid || null,
            auditId: created.id,
            metrics: { landingPath: attr?.landingPath || null },
          },
        })
        .catch((e) => console.warn("[audit/start] funnel event", e));
    }

    let queued = true;
    try {
      await inngest.send({
        name: "audit/run.requested",
        data: {
          auditId: created.id,
          websiteUrl,
          siteScope: parsed.data.siteScope,
          userSocial: userSocial ?? null,
          userImageUrls: userImageUrls ?? null,
          placeLat: place?.lat ?? null,
          placeLng: place?.lng ?? null,
          placeLabel: place?.name?.trim() || restaurantName,
          placePlaceId: place?.placeId ?? null,
          placeFormattedAddress: place?.formattedAddress ?? null,
        },
      });
    } catch (inngestErr) {
      queued = false;
      console.warn("[audit/start] Inngest send skipped — scheduling after() fallback", inngestErr);
    }

    if (!queued) {
      // Never block the request on a full pipeline (Netlify function timeouts → 503).
      // Run in the background and let the client poll /api/audit/:id.
      const pipelineInput = {
        websiteUrl,
        siteScope: parsed.data.siteScope,
        userSocial: userSocial ?? null,
        userImageUrls: userImageUrls ?? null,
        place: place
          ? {
              name: place.name,
              placeId: place.placeId,
              formattedAddress: place.formattedAddress,
              lat: place.lat ?? null,
              lng: place.lng ?? null,
            }
          : null,
      };
      const auditId = created.id;
      after(async () => {
        try {
          const { executeAuditPipeline } = await import("@/lib/audit/execute-audit-pipeline");
          await executeAuditPipeline(auditId, pipelineInput);
        } catch (inlineErr) {
          console.error("[audit/start] after() pipeline failed", inlineErr);
        }
      });
    }

    return NextResponse.json({ id: created.id, scanStatus: "pending" }, { status: 201 });
  } catch (e) {
    console.error("[audit/start]", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            code: "database_schema",
            error: "Database is missing the audit table.",
            hint:
              process.env.NODE_ENV === "development"
                ? "Run: npm run db:migrate (or npx prisma db push)"
                : undefined,
          },
          { status: 503 },
        );
      }
      if (e.code === "P1001" || e.code === "P1000") {
        return NextResponse.json(
          {
            code: "database_unreachable",
            error: "Cannot reach the database.",
            hint:
              process.env.NODE_ENV === "development"
                ? "Check DATABASE_URL in .env.local and that Postgres/Supabase is running."
                : undefined,
          },
          { status: 503 },
        );
      }
    }

    const devDetail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json(
      {
        code: "unknown",
        error: "Could not start audit",
        ...(devDetail ? { hint: devDetail } : {}),
      },
      { status: 500 },
    );
  }
}
