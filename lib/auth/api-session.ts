import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { isUiPreviewEnabled, PREVIEW_USER_ID } from "@/lib/preview/ui-preview";

export type ApiSessionResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string };

export async function requireApiUser(): Promise<ApiSessionResult> {
  // UI preview browses the dashboard without Supabase or Postgres.
  if (isUiPreviewEnabled()) {
    return { ok: true, userId: PREVIEW_USER_ID };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  try {
    await ensureAppUser(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Profile sync failed";
    return { ok: false, status: 400, message };
  }

  return { ok: true, userId: user.id };
}
