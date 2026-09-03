/**
 * Preview fixtures for the Customers tab.
 *
 * The sample reviews are the only invented input — every score below is produced by
 * the same `computeNps` / theme-tally code the live tab uses, so the preview reflects
 * real behaviour instead of hand-written totals.
 */
import type { ReviewSentiment, ReviewTheme } from "@prisma/client";
import { computeNps, type ThemeDriver, type WeeklyNps } from "@/lib/insights/customer-voice";

type PreviewReview = {
  id: string;
  body: string;
  rating: number;
  reviewerName: string | null;
  reviewedAt: string;
  themes: { theme: ReviewTheme; sentiment: ReviewSentiment }[];
};

const THEME_LABELS: Record<ReviewTheme, string> = {
  FOOD: "Food quality",
  SERVICE: "Service",
  PRICE: "Pricing",
  SPEED: "Speed",
  ATMOSPHERE: "Atmosphere",
  CLEANLINESS: "Cleanliness",
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function seed(): PreviewReview[] {
  const rows: Array<[number, number, string, string, Array<[ReviewTheme, ReviewSentiment]>]> = [
    [2, 5, "Maya R.", "Best brisket in Austin. Staff remembered our anniversary.", [["FOOD", "POSITIVE"], ["SERVICE", "POSITIVE"]]],
    [4, 5, "Dan K.", "Room feels great on a Friday, cocktails were excellent.", [["ATMOSPHERE", "POSITIVE"]]],
    [6, 4, "Priya S.", "Food was lovely but we waited 25 minutes for the mains.", [["FOOD", "POSITIVE"], ["SPEED", "NEGATIVE"]]],
    [9, 5, "Tom W.", "Booked online in seconds and the table was ready. Faultless.", [["SERVICE", "POSITIVE"]]],
    [12, 3, "Alex M.", "Tasty, but £19 for a side plate felt steep for the portion.", [["PRICE", "NEGATIVE"], ["FOOD", "POSITIVE"]]],
    [15, 5, "Grace L.", "Second visit this month — the short rib is worth the trip.", [["FOOD", "POSITIVE"]]],
    [18, 2, "Chris B.", "Long wait to be seated even with a reservation, and the bathrooms needed attention.", [["SPEED", "NEGATIVE"], ["CLEANLINESS", "NEGATIVE"]]],
    [21, 5, "Nina P.", "Warm welcome, great music, we stayed for a third round.", [["ATMOSPHERE", "POSITIVE"], ["SERVICE", "POSITIVE"]]],
    [26, 4, "Sam H.", "Solid food, service a little stretched when it got busy.", [["FOOD", "POSITIVE"], ["SERVICE", "NEGATIVE"]]],
    [31, 5, "Lauren D.", "Took visiting family here and everyone raved about the sides.", [["FOOD", "POSITIVE"]]],
    [38, 4, "Owen F.", "Great value set lunch. Would come back midweek.", [["PRICE", "POSITIVE"]]],
    [45, 5, "Ruth A.", "Genuinely the friendliest team on the street.", [["SERVICE", "POSITIVE"]]],
    [52, 3, "Jae C.", "Kitchen was slow and my order came out cold.", [["SPEED", "NEGATIVE"], ["FOOD", "NEGATIVE"]]],
    [61, 5, "Beth O.", "Beautiful plates, beautiful room. Book ahead.", [["FOOD", "POSITIVE"], ["ATMOSPHERE", "POSITIVE"]]],
  ];

  return rows.map(([days, rating, reviewerName, body, themes], i) => ({
    id: `preview-review-${i + 1}`,
    body,
    rating,
    reviewerName,
    reviewedAt: daysAgo(days),
    themes: themes.map(([theme, sentiment]) => ({ theme, sentiment })),
  }));
}

export function getPreviewCustomerVoice() {
  const reviews = seed();
  const nps = computeNps(reviews.map((r) => r.rating));

  const tally = new Map<ReviewTheme, { positive: number; negative: number }>();
  for (const theme of Object.keys(THEME_LABELS) as ReviewTheme[]) {
    tally.set(theme, { positive: 0, negative: 0 });
  }
  for (const review of reviews) {
    for (const tag of review.themes) {
      const entry = tally.get(tag.theme)!;
      if (tag.sentiment === "POSITIVE") entry.positive++;
      else if (tag.sentiment === "NEGATIVE") entry.negative++;
    }
  }

  const drivers: ThemeDriver[] = Array.from(tally.entries())
    .map(([theme, counts]) => ({
      theme,
      label: THEME_LABELS[theme],
      positive: counts.positive,
      negative: counts.negative,
      net: counts.positive - counts.negative,
    }))
    .sort((a, b) => a.net - b.net);

  const topRisk = drivers.find((d) => d.negative > 0);
  if (topRisk) topRisk.alert = true;

  const weekly: WeeklyNps[] = [];
  for (let w = 7; w >= 0; w--) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - w * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    const inWeek = reviews.filter((r) => {
      const at = new Date(r.reviewedAt);
      return at >= start && at < end;
    });
    const weekNps = computeNps(inWeek.map((r) => r.rating));
    weekly.push({ week: start.toISOString().slice(0, 10), nps: weekNps.total > 0 ? weekNps.nps : 0 });
  }

  return {
    nps,
    drivers,
    weekly,
    alertMessage: topRisk
      ? `${topRisk.label} is your biggest risk area with ${topRisk.negative} negative mention${topRisk.negative === 1 ? "" : "s"}.`
      : null,
    reviews,
  };
}
