import { NextResponse } from "next/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    await ensureAppUser(user);
    await ensureSalesWorkspaceMembership(user.id);
  } catch {
    return NextResponse.json({ error: "profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
