import { ensureAppUser } from "@/lib/auth/ensure-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readSupabasePublicEnv } from "@/lib/supabase/public-env";

/** Auth for public pages (audit). Returns null when logged out — never redirects. */
export async function getOptionalAppUser() {
  if (isUiPreviewEnabled()) {
    return { id: "preview", email: "preview@trykob.com" } as const;
  }
  if (!readSupabasePublicEnv()) return null;

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
