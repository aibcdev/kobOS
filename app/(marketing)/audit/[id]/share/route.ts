import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { renderAuditShareHtml } from "@/lib/audit/render-share-html";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Raw static HTML share page — no React, no RSC flight payload.
 * Use this URL for team / AI review tools that cannot render the interactive audit.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const audit = await findVisibilityAuditByIdOrSlug(id);
  if (!audit) {
    return new Response("<!DOCTYPE html><html><body><h1>Audit not found</h1></body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = renderAuditShareHtml({
    id: audit.id,
    slug: audit.slug,
    restaurantName: audit.restaurantName,
    city: audit.city,
    websiteUrl: audit.websiteUrl,
    overallScore: audit.overallScore,
    seoScore: audit.seoScore,
    designScore: audit.designScore,
    mobileScore: audit.mobileScore,
    conversionScore: audit.conversionScore,
    resultPayload: audit.resultPayload,
  });

  if (!html) {
    return new Response("<!DOCTYPE html><html><body><h1>Invalid audit</h1></body></html>", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Robots-Tag": "index, follow",
    },
  });
}
