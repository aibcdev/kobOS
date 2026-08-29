import { createBrowserClient } from "@supabase/ssr";
import { readSupabasePublicEnv } from "@/lib/supabase/public-env";

export function createSupabaseBrowserClient() {
  const pub = readSupabasePublicEnv();
  if (!pub) {
    throw new Error("Supabase public env is missing or not a valid HTTP URL");
  }
  return createBrowserClient(pub.url, pub.anonKey);
}
