import { NextResponse } from "next/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PROFILE_TIMEOUT_MS = 8_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("profile_timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** After browser magic-link exchange — create app profile + sales workspace link. */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await withTimeout(
      Promise.all([
        ensureAppUser(user),
        ensureSalesWorkspaceMembership(user.id, user.email),
      ]),
      PROFILE_TIMEOUT_MS,
    );
  } catch (err) {
    const timedOut = err instanceof Error && err.message === "profile_timeout";
    console.error("[api/auth/complete]", err);
    // Session is valid — let the client continue to the dashboard; layout retries upsert.
    if (timedOut) {
      return NextResponse.json({ ok: true, deferred: true });
    }
    return NextResponse.json({ error: "profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
