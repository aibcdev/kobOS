import { NextResponse } from "next/server";
import { z } from "zod";
import { executeAuditPipeline } from "@/lib/audit/execute-audit-pipeline";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
/** Allow long scans on hosts that honor maxDuration (Netlify Pro / Vercel). */
export const maxDuration = 300;

const bodySchema = z.object({
  websiteUrl: z.string().url().max(2048),
  siteScope: z.enum(["one", "multiple"]).default("one"),
  userSocial: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      googleBusinessUrl: z.string().optional(),
    })
    .nullable()
    .optional(),
  userImageUrls: z.array(z.string()).nullable().optional(),
  place: z
    .object({
      name: z.string().optional(),
      placeId: z.string().optional(),
      formattedAddress: z.string().optional(),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.OPS_STATUS_SECRET?.trim() || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = await prisma.visibilityAudit.findUnique({
    where: { id },
    select: { id: true, overallScore: true, websiteUrl: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if ((existing.overallScore ?? 0) > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already_scored" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse({
    websiteUrl: existing.websiteUrl,
    ...(typeof body === "object" && body ? body : {}),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await executeAuditPipeline(id, {
      websiteUrl: parsed.data.websiteUrl,
      siteScope: parsed.data.siteScope,
      userSocial: parsed.data.userSocial ?? null,
      userImageUrls: parsed.data.userImageUrls ?? null,
      place: parsed.data.place ?? null,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[audit/process]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "pipeline failed" },
      { status: 500 },
    );
  }
}
