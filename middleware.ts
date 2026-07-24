import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api/inngest") ||
    path.startsWith("/api/stripe/status") ||
    path.startsWith("/api/gemini/status") ||
    path.startsWith("/api/auth/status")
  ) {
    return NextResponse.next();
  }

  // Public audits — skip auth session work so bots / preview tools get a clean response.
  if (path.startsWith("/audit/")) {
    return NextResponse.next();
  }

  const previewDashboard =
    isUiPreviewEnabled() && (path.startsWith("/dashboard") || path.startsWith("/app"));
  if (previewDashboard) {
    return NextResponse.next();
  }

  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabase) {
    if (path.startsWith("/dashboard") || path.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "missing_env");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
