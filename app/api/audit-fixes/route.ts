import { ServiceRequestStatus, ServiceRequestType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeAuditOpportunityReport,
  ensureMoneyFirstOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import { parseAuditPayload } from "@/lib/audit/types";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { prisma } from "@/lib/db/prisma";
import { notifyOpsAboutServiceRequest } from "@/lib/ops/notify-service-request";
import { isPreviewRestaurantId } from "@/lib/preview/ui-preview";

const postSchema = z.object({
  restaurantId: z.string().min(12),
  fixKey: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  detail: z.string().max(1000).optional(),
  auditId: z.string().min(8).max(64).optional(),
});

function fixKeyFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Wins from the linked audit + any open AUDIT_FIX requests. */
export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const restaurantId = new URL(req.url).searchParams.get("restaurantId")?.trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  }

  if (isPreviewRestaurantId(restaurantId)) {
    return NextResponse.json({ auditId: null, auditSlug: null, wins: [], requests: [] });
  }

  const restaurant = await getRestaurantForMember(session.userId, restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audit = await prisma.visibilityAudit.findFirst({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      restaurantName: true,
      city: true,
      websiteUrl: true,
      resultPayload: true,
    },
  });

  const requests = await prisma.serviceRequest.findMany({
    where: { restaurantId, type: ServiceRequestType.AUDIT_FIX },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let wins: Array<{
    key: string;
    title: string;
    detail: string;
    customersPerMonth: number | null;
  }> = [];
  if (audit) {
    const payload = parseAuditPayload(audit.resultPayload);
    if (payload) {
      const opportunity = ensureMoneyFirstOpportunityReport(
        payload.opportunityReport ??
          computeAuditOpportunityReport(payload, {
            name: audit.restaurantName,
            city: audit.city,
            websiteUrl: audit.websiteUrl,
          }),
        payload,
      );
      // Per-fix impact is a share of the modelled lost customers — no estimate, no number.
      const lost = opportunity.opportunity_score?.est_monthly_lost_customers ?? 0;
      wins = opportunity.topFixes.slice(0, 3).map((f) => ({
        key: fixKeyFromTitle(f.title),
        title: f.title,
        detail: f.detail,
        customersPerMonth: lost > 0 ? f.customersPerMonth : null,
      }));
    }
  }

  return NextResponse.json({
    auditId: audit?.id ?? null,
    auditSlug: audit?.slug ?? null,
    wins,
    requests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/** Owner clicks a win → Pending request + email to KOB operator for manual fulfillment. */
export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { restaurantId, fixKey, title, detail, auditId } = parsed.data;

  // Preview mode has no database — acknowledge the click so the UI flow can be reviewed.
  if (isPreviewRestaurantId(restaurantId)) {
    return NextResponse.json(
      {
        ok: true,
        preview: true,
        request: {
          id: `preview-request-${fixKey}`,
          title,
          notes: `fixKey=${fixKey}`,
          status: ServiceRequestStatus.REQUESTED,
          createdAt: new Date().toISOString(),
        },
        message: "Requested — in preview mode nothing is sent to the team.",
      },
      { status: 201 },
    );
  }

  const restaurant = await getRestaurantForMember(session.userId, restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Free owners can queue fixes — ops fulfills and marks Delivered (no upgrade gate).
  const open = await prisma.serviceRequest.findFirst({
    where: {
      restaurantId,
      type: ServiceRequestType.AUDIT_FIX,
      status: { in: [ServiceRequestStatus.REQUESTED, ServiceRequestStatus.IN_PROGRESS] },
      OR: [{ title }, { notes: { contains: `fixKey=${fixKey}` } }],
    },
    select: { id: true, status: true, title: true },
  });
  if (open) {
    return NextResponse.json(
      {
        ok: true,
        alreadyPending: true,
        request: open,
        message: "Already requested — our team has this one. You'll get an update within 48 hours.",
      },
      { status: 200 },
    );
  }

  const notes = [
    `fixKey=${fixKey}`,
    auditId ? `auditId=${auditId}` : null,
    detail?.trim() || null,
    "Fulfill manually. Mark Delivered when done.",
  ]
    .filter(Boolean)
    .join("\n");

  const created = await prisma.serviceRequest.create({
    data: {
      restaurantId,
      type: ServiceRequestType.AUDIT_FIX,
      status: ServiceRequestStatus.REQUESTED,
      title,
      notes,
      creditCost: 0,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  const notify = await notifyOpsAboutServiceRequest(created.id, {
    requestedByEmail: user?.email ?? null,
    source: "Today priorities",
  });

  return NextResponse.json(
    {
      ok: true,
      request: {
        id: created.id,
        title: created.title,
        notes: created.notes,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
      notified: notify.ok,
      message:
        "Requested — our team has this. You'll get an update on your dashboard within 48 hours.",
    },
    { status: 201 },
  );
}
