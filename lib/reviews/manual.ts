import type { CustomerReview } from "@prisma/client";
import { draftReplyForReview, type ReplyDraft } from "@/lib/agent/review-reply";
import { prisma } from "@/lib/db/prisma";

/**
 * Reviews the owner adds by hand (pasted from Google) until KOB can read them from Google itself. Each one becomes
 * a CustomerReview and gets the same drafted reply as a synced review. A rating the owner didn't give stays 0
 * ("not given"); KOB never guesses one.
 */

export type ManualReview = { body: string; rating: number; reviewer: string | null; url: string | null };

export const MAX_PER_PASTE = 50;
const URL_RE = /https?:\/\/\S+/i;
/** Lines Google adds around a copied review: "Local Guide · 12 reviews · 3 photos", "a week ago", "New", "Owner response". */
const META_RE =
  /^(local guide\b.*|\d+\s+reviews?\b.*|.*\b\d+\s+photos?\b.*|(a|an|\d+)\s+(minute|hour|day|week|month|year)s?\s+ago|new|edited.*|like|share|more|response from the owner.*)$/i;

export function ratingIn(text: string): number {
  const filled = (text.match(/★/g) ?? []).length;
  if (filled >= 1 && filled <= 5) return filled;
  const m = text.match(/\b([1-5])(?:\.0)?\s*(?:\/\s*5|stars?|out of 5)\b/i) ?? text.match(/\brating:?\s*([1-5])\b/i);
  return m ? Number(m[1]) : 0;
}

function parseOne(chunk: string): ManualReview | null {
  const url = chunk.match(URL_RE)?.[0]?.replace(/[).,]+$/, "") ?? null;
  const rating = ratingIn(chunk);
  let lines = chunk
    .replace(URL_RE, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let reviewer: string | null = null;
  // "Name: text…" or a trailing "— Name"
  const prefixed = /^([A-Z][\p{L}'.-]*(?: [\p{L}'.-]+){0,3}):\s+(.+)$/u.exec(lines[0] ?? "");
  if (prefixed) {
    reviewer = prefixed[1];
    lines[0] = prefixed[2];
  }
  const signed = /^[—–-]\s*([\p{L}'. -]{2,40})$/u.exec(lines.at(-1) ?? "");
  if (!reviewer && signed) {
    reviewer = signed[1].trim();
    lines = lines.slice(0, -1);
  }
  // Star lines and Google's meta lines aren't the review.
  lines = lines.map((l) => l.replace(/[★☆]+/g, "").replace(/\b[1-5](?:\.0)?\s*(?:\/\s*5|stars?|out of 5)\b/gi, "").replace(/^rating:?\s*[1-5]\b/i, "").trim()).filter((l) => l && !META_RE.test(l));
  // Copied from Google: the first line is the reviewer's name when more follows.
  if (!reviewer && lines.length > 1 && lines[0].length <= 40 && lines[0].split(/\s+/).length <= 4 && !/[.!?,]$/.test(lines[0])) {
    reviewer = lines[0];
    lines = lines.slice(1);
  }
  const body = lines.join("\n").trim().slice(0, 4000);
  if (!body && !rating) return null;
  return { body, rating, reviewer, url };
}

/** One paste, one or many reviews: split on blank lines or "---" lines. */
export function parseReviews(text: string): ManualReview[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*(?:-{3,}|={3,}|\*{3,})?\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map(parseOne)
    .filter((r): r is ManualReview => r !== null)
    .slice(0, MAX_PER_PASTE);
}

export type AddedReview = { review: CustomerReview; draft: ReplyDraft | null; duplicate: boolean };

/** Save the reviews (skipping ones already there) and draft a reply to each new one. */
export async function addManualReviews(
  restaurantId: string,
  reviews: ManualReview[],
  userId: string | null,
  opts: { now?: Date } = {},
): Promise<AddedReview[]> {
  const out: AddedReview[] = [];
  for (const r of reviews.slice(0, MAX_PER_PASTE)) {
    const existing = r.body
      ? await prisma.customerReview.findFirst({ where: { restaurantId, body: r.body } })
      : null;
    if (existing) {
      out.push({ review: existing, draft: null, duplicate: true });
      continue;
    }
    const review = await prisma.customerReview.create({
      data: {
        restaurantId,
        source: "GOOGLE",
        rating: r.rating,
        body: r.body,
        reviewerName: r.reviewer,
        sourceUrl: r.url,
        reviewedAt: opts.now ?? new Date(),
      },
    });
    out.push({ review, draft: await draftReplyForReview(restaurantId, review, userId, { now: opts.now }), duplicate: false });
  }
  return out;
}
