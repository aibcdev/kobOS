import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  countryFromHeaders,
  parsePriceRegion,
  PRICE_REGION_COOKIE,
  regionForCountry,
} from "@/lib/billing/regional-pricing";
import { isOpenProductPath } from "@/lib/preview/open-product";
import { updateSession } from "@/lib/supabase/middleware";
import { readSupabasePublicEnv } from "@/lib/supabase/public-env";

/** `?region=gb|us` overrides; otherwise keep the existing cookie or derive from geo. */
function withPriceRegion(request: NextRequest, response: NextResponse): NextResponse {
  const override = parsePriceRegion(request.nextUrl.searchParams.get("region"));
  const existing = parsePriceRegion(request.cookies.get(PRICE_REGION_COOKIE)?.value);
  const region = override ?? existing ?? regionForCountry(countryFromHeaders(request.headers));
  if (region !== existing) {
    response.cookies.set(PRICE_REGION_COOKIE, region, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  return withPriceRegion(request, await route(request));
}

async function route(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api/inngest") ||
    path.startsWith("/api/stripe/status") ||
    path.startsWith("/api/gemini/status") ||
    path.startsWith("/api/auth/status")
  ) {
    return NextResponse.next();
  }

  // Public audits + team review — skip auth session work so bots / preview tools get a clean response.
  if (
    path.startsWith("/audit/") ||
    path.startsWith("/audit-reviews/") ||
    path.startsWith("/review/") ||
    path.startsWith("/api/audit/")
  ) {
    return NextResponse.next();
  }

  if (isOpenProductPath(path)) {
    return NextResponse.next();
  }

  const hasSupabase = Boolean(readSupabasePublicEnv());

  if (!hasSupabase) {
    if (path.startsWith("/ops")) {
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
    // Skip static assets including plain-text audit dumps under /public
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|html|css|js|map|ico|woff2?)$).*)",
  ],
};
