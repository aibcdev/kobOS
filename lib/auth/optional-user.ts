import { ensureAppUser } from "@/lib/auth/ensure-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Auth for public pages (audit). Returns null when logged out — never redirects. */
export async function getOptionalAppUser() {
  if (isUiPreviewEnabled()) {
    return { id: "preview", email: "preview@trykob.com" } as const;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    await ensureAppUser(user);
    return user;
  } catch {
    return null;
  }
}
