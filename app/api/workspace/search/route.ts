import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId");
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ results: [] });

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contains = { contains: q, mode: "insensitive" as const };

  const [reviews, content, keywords, assets, campaigns, tasks] = await Promise.all([
    prisma.customerReview.findMany({
      where: { restaurantId, body: contains },
      take: 8,
      select: { id: true, body: true, reviewerName: true },
    }),
    prisma.generatedContent.findMany({
      where: { restaurantId, OR: [{ prompt: contains }, { output: contains }] },
      take: 8,
      select: { id: true, prompt: true, type: true },
    }),
    prisma.keyword.findMany({
      where: { restaurantId, keyword: contains },
      take: 8,
      select: { id: true, keyword: true },
    }),
    prisma.asset.findMany({
      where: { restaurantId, url: contains },
      take: 8,
      select: { id: true, url: true, type: true },
    }),
    prisma.campaign.findMany({
      where: { restaurantId, title: contains },
      take: 8,
      select: { id: true, title: true },
    }),
    prisma.chiefOfStaffTask.findMany({
      where: { restaurantId, OR: [{ title: contains }, { detail: contains }] },
      take: 8,
      select: { id: true, title: true },
    }),
  ]);

  const results = [
    ...reviews.map((r) => ({
      type: "review" as const,
      id: r.id,
      label: r.reviewerName ?? "Review",
      snippet: r.body.slice(0, 120),
      href: `/dashboard/reviews?r=${restaurantId}`,
    })),
    ...content.map((c) => ({
      type: "content" as const,
      id: c.id,
      label: c.prompt.slice(0, 60),
      snippet: c.type,
      href: `/dashboard/content?r=${restaurantId}`,
    })),
    ...keywords.map((k) => ({
      type: "keyword" as const,
      id: k.id,
      label: k.keyword,
      snippet: "Tracked keyword",
      href: `/dashboard/seo?r=${restaurantId}`,
    })),
    ...assets.map((a) => ({
      type: "asset" as const,
      id: a.id,
      label: a.type.replace(/_/g, " "),
      snippet: (a.url ?? "").slice(0, 80),
      href: `/dashboard/brand?r=${restaurantId}`,
    })),
    ...campaigns.map((c) => ({
      type: "campaign" as const,
      id: c.id,
      label: c.title,
      snippet: "Campaign",
      href: `/dashboard/marketing?r=${restaurantId}`,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      label: t.title,
      snippet: "Today task",
      href: `/dashboard?r=${restaurantId}`,
    })),
  ];

  return NextResponse.json({ results });
}
