import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabasePublicEnv } from "@/lib/supabase/public-env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const pub = readSupabasePublicEnv();
  if (!pub) {
    throw new Error("Supabase public env is missing or not a valid HTTP URL");
  }

  return createServerClient(
    pub.url,
    pub.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from Server Component — cookies may be read-only */
          }
        },
      },
    },
  );
}
