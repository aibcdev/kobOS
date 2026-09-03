import { NextResponse } from "next/server";
import { z } from "zod";
import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { prisma } from "@/lib/db/prisma";
import { parseHeardFrom } from "@/lib/marketing/heard-from";
import { checkSimpleRateLimit, clientIpFromHeaders } from "@/lib/security/simple-rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  auditId: z.string().trim().min(3).max(80).optional(),
  heardFrom: z.string().trim().max(40).optional(),
  aiPrompt: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers) ?? "unknown";
  const rl = checkSimpleRateLimit(`heard-from:${ip}`, { windowMs: 60 * 60 * 1000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const heard = parseHeardFrom(parsed.data);
  if (!heard.heardFrom && !heard.aiPrompt) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const auditId = parsed.data.auditId?.trim();
  if (!auditId) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const existing = await findVisibilityAuditByIdOrSlug(auditId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.visibilityAudit.update({
    where: { id: existing.id },
    data: {
      heardFrom: heard.heardFrom ?? existing.heardFrom,
      aiPrompt: heard.aiPrompt ?? existing.aiPrompt,
    },
  });

  return NextResponse.json({ ok: true, stored: true });
}
