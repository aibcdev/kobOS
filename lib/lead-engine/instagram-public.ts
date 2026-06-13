/** Best-effort public Instagram stats without paid API. */

function parseFollowerCount(raw: string): number | null {
  const s = raw.trim().replace(/,/g, "");
  const m = s.match(/^([\d.]+)\s*([KkMm])?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "K") return Math.round(n * 1000);
  if (suffix === "M") return Math.round(n * 1_000_000);
  return Math.round(n);
}

export type InstagramPublicStats = {
  followers: number | null;
  postGapDays: number | null;
};

export async function fetchInstagramPublicStats(instagramUrl: string): Promise<InstagramPublicStats> {
  try {
    const url = instagramUrl.startsWith("http") ? instagramUrl : `https://${instagramUrl}`;
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KOB-LeadEngine/1.0; +https://trykob.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { followers: null, postGapDays: null };

    const html = await res.text();

    let followers: number | null = null;
    const followerPatterns = [
      /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
      /([\d,.]+[KkMm]?)\s+Followers/i,
      /content="([\d,.]+[KkMm]?)\s+Followers/i,
    ];
    for (const re of followerPatterns) {
      const m = html.match(re);
      if (m?.[1]) {
        followers = parseFollowerCount(m[1]);
        if (followers != null) break;
      }
    }

    let postGapDays: number | null = null;
    const tsMatch = html.match(/"taken_at_timestamp"\s*:\s*(\d{10})/);
    if (tsMatch?.[1]) {
      const taken = Number(tsMatch[1]) * 1000;
      if (Number.isFinite(taken)) {
        postGapDays = Math.max(0, Math.floor((Date.now() - taken) / 86_400_000));
      }
    }

    return { followers, postGapDays };
  } catch {
    return { followers: null, postGapDays: null };
  }
}
