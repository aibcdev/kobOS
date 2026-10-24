import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { googleReviewLink, reviewAskMessage, reviewQrSvg, tableCardHtml } from "@/lib/reviews/review-kit";

export const runtime = "nodejs";

/**
 * The owner's review kit: `format=link` (JSON with the link and a thank-you message), `qr` (SVG download) or `card`
 * (printable table card).
 */
export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId") ?? "";
  if (!restaurantId || !(await assertRestaurantMembership(session.userId, restaurantId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const link = await googleReviewLink(restaurantId);
  if (!link)
    return NextResponse.json(
      { error: "no_review_link", message: "Connect your Google listing (or run the free check) so KOB knows which listing to send guests to." },
      { status: 404 },
    );
  const { name } = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { name: true } });
  const format = url.searchParams.get("format") ?? "link";
  const noStore = { "Cache-Control": "no-store" };

  if (format === "qr")
    return new NextResponse(await reviewQrSvg(link.url), {
      headers: { ...noStore, "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="google-review-qr.svg"` },
    });
  if (format === "card") return new NextResponse(await tableCardHtml(name, link.url), { headers: { ...noStore, "Content-Type": "text/html; charset=utf-8" } });
  return NextResponse.json(
    { url: link.url, source: link.source, messages: { sms: reviewAskMessage(name, link.url, "sms"), email: reviewAskMessage(name, link.url, "email") } },
    { headers: noStore },
  );
}
