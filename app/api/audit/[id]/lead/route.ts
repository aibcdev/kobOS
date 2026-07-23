import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isValidAuditPhone, normalizeAuditPhone } from "@/lib/marketing/audit-lead";
import {
  checkSimpleRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/simple-rate-limit";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(40)
    .refine((v) => isValidAuditPhone(v), "Enter a valid mobile number (at least 10 digits)."),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: "Invalid audit id" }, { status: 400 });
  }

  const ip = clientIpFromHeaders(req.headers) ?? "unknown";
  const rl = checkSimpleRateLimit(`audit-lead:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 20,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many unlock attempts. Try again later.", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const phoneErr = flat.fieldErrors.phone?.[0];
    const emailErr = flat.fieldErrors.email?.[0];
    const message = phoneErr ?? emailErr ?? "Check your email and mobile number.";
    return NextResponse.json({ error: message, details: flat }, { status: 400 });
  }

  try {
    const existing = await prisma.visibilityAudit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.visibilityAudit.update({
      where: { id },
      data: {
        leadEmail: parsed.data.email,
        leadPhone: normalizeAuditPhone(parsed.data.phone),
        leadCapturedAt: new Date(),
      },
    });

    revalidatePath(`/audit/${id}`);
    revalidatePath("/audit");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[audit/lead]", e);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
