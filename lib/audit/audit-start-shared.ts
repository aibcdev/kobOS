import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditCityLabel, hostLabelFromUrl } from "@/lib/audit/derive-audit-labels";
import { cityFromFormattedAddress, createPendingAuditSeed } from "@/lib/audit/create-pending-audit";
import type { AuditUserSocialInput } from "@/lib/audit/evidence-pack";
import { normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";
import { checkAuditRunRateLimit, clientIpFromHeaders } from "@/lib/audit/rate-limit";
import { executeAuditPipeline } from "@/lib/audit/execute-audit-pipeline";
import { validateAuditRuntimeEnv } from "@/lib/audit/validate-audit-runtime";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";

export const auditStartBodySchema = z.object({
  websiteUrl: z.string().trim().min(1).max(2048),
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

  const websiteUrl = normalizeAuditWebsiteUrl(parsed.data.websiteUrl);
  if (!websiteUrl) {
    return NextResponse.json(
      { error: "Enter a valid website URL (e.g. turtlebay.co.uk)." },
      { status: 400 },
    );
  }

  const place = parsed.data.place;
  const restaurantName =
    place?.name?.trim() || hostLabelFromUrl(websiteUrl);
  const city =
    place?.formattedAddress?.trim()
      ? cityFromFormattedAddress(place.formattedAddress)
      : auditCityLabel(parsed.data.siteScope);

  const rawSocial = parsed.data.userSocial;
  const userSocial: AuditUserSocialInput | undefined =
    rawSocial &&
    (rawSocial.instagram || rawSocial.facebook || rawSocial.tiktok || rawSocial.googleBusinessUrl)
      ? {
          instagram: emptyToUndef(rawSocial.instagram),
          facebook: emptyToUndef(rawSocial.facebook),
          tiktok: emptyToUndef(rawSocial.tiktok),
          googleBusinessUrl: emptyToUndef(rawSocial.googleBusinessUrl),
        }
      : undefined;

  const userImageUrls =
    parsed.data.userImageUrls?.map((u) => u.trim()).filter(Boolean).slice(0, 3) ?? undefined;

  try {
    const { row } = createPendingAuditSeed({ restaurantName, city, websiteUrl });

    const created = await prisma.visibilityAudit.create({ data: row });

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
      console.warn("[audit/start] Inngest send skipped — running inline fallback", inngestErr);
    }

    if (!queued) {
      const inlineMs = process.env.NODE_ENV === "development" ? 120_000 : 55_000;
      try {
        await Promise.race([
          executeAuditPipeline(created.id, {
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
          }),
          new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("audit_inline_timeout")), inlineMs);
          }),
        ]);
        return NextResponse.json({ id: created.id, scanStatus: "ready", inline: true }, { status: 201 });
      } catch (inlineErr) {
        console.error("[audit/start] inline pipeline failed", inlineErr);
        if (process.env.NODE_ENV !== "development") {
          return NextResponse.json(
            {
              code: "background_unavailable",
              error: "Background scan unavailable.",
              id: created.id,
            },
            { status: 503 },
          );
        }
      }
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
