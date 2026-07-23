import { NextResponse } from "next/server";

import {
  markAiJobsUnavailable,
  runAndPersistGeminiAuditSuite,
  runAndPersistPerceptionStep,
} from "@/lib/audit/persist-gemini-audit";
import { parseAuditPayload } from "@/lib/audit/types";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest/client";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Re-run perception (and optionally the full Gemini suite) when Overview is stuck on Analysing…
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const audit = await prisma.visibilityAudit.findUnique({
    where: { id },
    select: { id: true, resultPayload: true },
  });
  if (!audit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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

  // Prefer re-enqueue; if Inngest is down, run inline.
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

  // Fast path: unblock Overview now; Inngest continues benchmark/media
  const perception = await runAndPersistPerceptionStep(id);
  return NextResponse.json({ ok: true, mode: "perception_plus_enqueue", perception: perception.ok, enqueued });
}
