import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const previewDashboard =
    isUiPreviewEnabled() && (path.startsWith("/dashboard") || path.startsWith("/app"));
  if (previewDashboard) {
    return supabaseResponse;
  }

  if (path.startsWith("/dashboard") || path.startsWith("/app") || path.startsWith("/ops")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    const audit = request.nextUrl.searchParams.get("audit");
    const next = request.nextUrl.searchParams.get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) {
      // Allow relative next (e.g. /audit/slug)
      const dest = new URL(next, request.nextUrl.origin);
      return NextResponse.redirect(dest);
    }
    if (audit) {
      url.pathname = `/audit/${audit}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
