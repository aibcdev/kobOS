import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";

export type EnrichEmailResult =
  | { ok: true; email: string; source: "hunter" | "scrape" }
  | { ok: false; reason: string };

const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const BLOCKED_LOCAL = new Set(["noreply", "no-reply", "donotreply", "support", "help", "privacy", "abuse"]);

function pickBestEmail(candidates: string[]): string | null {
  const scored = candidates
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && !e.endsWith(".png") && !e.endsWith(".jpg"))
    .filter((e) => {
      const local = e.split("@")[0] ?? "";
      return !BLOCKED_LOCAL.has(local);
    });

  const preferred = scored.find((e) => /^(info|hello|contact|enquiries|enquiry|sales|bookings|office)@/.test(e));
  return preferred ?? scored[0] ?? null;
}

async function enrichViaHunter(domain: string): Promise<string | null> {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key || !domain) return null;

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    console.warn("[outbound] hunter HTTP", res.status);
    return null;
  }

  const json = (await res.json()) as {
    data?: { emails?: Array<{ value?: string; type?: string; confidence?: number }> };
  };

  const emails =
    json.data?.emails
      ?.map((e) => e.value?.trim())
      .filter((e): e is string => Boolean(e)) ?? [];

  return pickBestEmail(emails);
}

async function enrichViaScrape(websiteUrl: string): Promise<string | null> {
  try {
    const res = await fetch(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "KOB-Outbound/1.0 (+https://kob.app)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const fromMailto: string[] = [];
    let m: RegExpExecArray | null;
    MAILTO_RE.lastIndex = 0;
    while ((m = MAILTO_RE.exec(html)) !== null) {
      fromMailto.push(m[1]!);
    }
    const fromText = html.match(EMAIL_RE) ?? [];
    return pickBestEmail([...fromMailto, ...fromText]);
  } catch {
    return null;
  }
}

export async function enrichProspectEmail(websiteUrl: string | null): Promise<EnrichEmailResult> {
  const host = hostFromWebsiteUrl(websiteUrl);
  if (!host) {
    return { ok: false, reason: "no_domain" };
  }

  const hunterEmail = await enrichViaHunter(host);
  if (hunterEmail) {
    return { ok: true, email: hunterEmail, source: "hunter" };
  }

  if (websiteUrl) {
    const scraped = await enrichViaScrape(websiteUrl);
    if (scraped) {
      return { ok: true, email: scraped, source: "scrape" };
    }
  }

  return { ok: false, reason: "no_email_found" };
}
