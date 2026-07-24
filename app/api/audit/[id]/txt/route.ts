import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { renderAuditShareMarkdown } from "@/lib/audit/render-share-html";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Plain-text Opportunity Report. Prefer this for AI / review tools.
 * GET /api/audit/{id}/txt
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const audit = await findVisibilityAuditByIdOrSlug(id);
  if (!audit) {
    return new Response("Audit not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const text = renderAuditShareMarkdown({
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

  if (!text) {
    return new Response("Invalid audit payload\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
