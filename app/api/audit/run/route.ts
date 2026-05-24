import { NextResponse } from "next/server";
import { handleAuditStart } from "@/lib/audit/audit-start-shared";
import { prisma } from "@/lib/db/prisma";
import { parseAuditPayload } from "@/lib/audit/types";

export const runtime = "nodejs";

/** @deprecated Prefer POST /api/audit/start — same fast response; scan runs in background. */
export async function POST(req: Request) {
  const res = await handleAuditStart(req);
  if (res.status !== 201) return res;

  const data = (await res.json()) as { id: string };
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: data.id } });
  const payload = audit ? parseAuditPayload(audit.resultPayload) : null;

  return NextResponse.json(
    {
      id: data.id,
      partial: payload
        ? {
            scores: payload.scores,
            issues: payload.issues.slice(0, 3),
            opportunities: payload.opportunities.slice(0, 2),
            competitors: payload.competitors.map((c) => ({ name: c.name, mockScore: c.mockScore })),
            teaser: payload.teaser,
            scanStatus: payload.scanStatus,
          }
        : { scanStatus: "pending" },
    },
    { status: 201 },
  );
}
