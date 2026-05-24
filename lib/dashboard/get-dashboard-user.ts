import { redirect } from "next/navigation";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { getPreviewUser, isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** For dashboard routes: layout already guards, this satisfies types and edge runtimes. */
export async function getDashboardPageUser() {
  if (isUiPreviewEnabled()) {
    return getPreviewUser();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await ensureAppUser(user);
  return user;
}
