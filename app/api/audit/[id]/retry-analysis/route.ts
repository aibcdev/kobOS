import { NextResponse } from "next/server";

import {
  markAiJobsUnavailable,
  runAndPersistGeminiAuditSuite,
  runAndPersistPerceptionStep,
} from "@/lib/audit/persist-gemini-audit";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";
import {
  checkSimpleRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/simple-rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Re-run perception (and optionally the full Gemini suite) when Overview is stuck.
 * Requires lead unlock (paid funnel gate) + strict IP rate limit.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;

  const ip = clientIpFromHeaders(req.headers) ?? "unknown";
  const rl = checkSimpleRateLimit(`retry-analysis:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const audit = await prisma.visibilityAudit.findUnique({
    where: { id },
    select: { id: true, resultPayload: true, leadCapturedAt: true },
  });
  if (!audit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!audit.leadCapturedAt) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 500 });
  }

  let body: { full?: boolean } = {};
  try {
    body = (await req.json()) as { full?: boolean };
  } catch {
    body = {};
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    await markAiJobsUnavailable(id, "GEMINI_API_KEY is not configured");
    return NextResponse.json({ ok: true, mode: "heuristic", reason: "no_gemini_key" });
  }

  let enqueued = false;
  try {
    await inngest.send({ name: "audit/gemini-benchmark.requested", data: { auditId: id } });
    enqueued = true;
  } catch (e) {
    console.warn("[audit/retry-analysis] Inngest send failed", e);
  }

  if (!enqueued || body.full) {
    const result = await runAndPersistGeminiAuditSuite(id);
    return NextResponse.json({ ok: true, mode: "inline_suite", ...result, enqueued });
  }

  const perception = await runAndPersistPerceptionStep(id);
  return NextResponse.json({
    ok: true,
    mode: "perception_plus_enqueue",
    perception: perception.ok,
    enqueued,
  });
}
