import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import { scrapeWebsiteEmail } from "@/lib/outbound/scrape-website-email";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

function emailMode(): "scrape" | "hunter" | "auto" {
  const mode = process.env.LEAD_ENGINE_EMAIL_MODE?.trim().toLowerCase();
  if (mode === "scrape" || mode === "hunter") return mode;
  return "auto";
}

export type EnrichEmailResult =
  | { ok: true; email: string; source: "hunter" | "scrape" }
  | { ok: false; reason: string };

export type EnrichEmailOptions = {
  /** Scrape homepage first — reduces Hunter quota use. */
  preferScrape?: boolean;
  /** Never call Hunter — lead engine uses free scrape only. */
  scrapeOnly?: boolean;
};

const BLOCKED_LOCAL = new Set(["noreply", "no-reply", "donotreply", "support", "help", "privacy", "abuse"]);

function pickBestEmail(candidates: string[], websiteUrl: string | null): string | null {
  const scored = candidates
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && !e.endsWith(".png") && !e.endsWith(".jpg"))
    .filter((e) => {
      const local = e.split("@")[0] ?? "";
      return !BLOCKED_LOCAL.has(local);
    })
    .filter((e) => isValidProspectEmail(e, websiteUrl).ok);

  const preferred = scored.find((e) =>
    /^(info|hello|contact|enquiries|enquiry|sales|bookings|office|admin|reservations)@/.test(e),
  );
  return preferred ?? scored[0] ?? null;
}

async function enrichViaHunter(domain: string, websiteUrl: string | null): Promise<string | null> {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key || !domain) return null;

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", "8");

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), { method: "GET" });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
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

    return pickBestEmail(emails, websiteUrl);
  }

  console.warn("[outbound] hunter HTTP 429");
  return null;
}

async function enrichViaScrape(websiteUrl: string): Promise<string | null> {
  return scrapeWebsiteEmail(websiteUrl);
}

export async function enrichProspectEmail(
  websiteUrl: string | null,
  options?: EnrichEmailOptions,
): Promise<EnrichEmailResult> {
  const host = hostFromWebsiteUrl(websiteUrl);
  if (!host) {
    return { ok: false, reason: "no_domain" };
  }

  const tryScrape = async (): Promise<EnrichEmailResult | null> => {
    if (!websiteUrl) return null;
    const scraped = await enrichViaScrape(websiteUrl);
    if (!scraped) return null;
    const valid = isValidProspectEmail(scraped, websiteUrl);
    if (!valid.ok) return { ok: false, reason: valid.reason };
    return { ok: true, email: scraped, source: "scrape" };
  };

  const tryHunter = async (): Promise<EnrichEmailResult | null> => {
    const hunterEmail = await enrichViaHunter(host, websiteUrl);
    if (!hunterEmail) return null;
    const valid = isValidProspectEmail(hunterEmail, websiteUrl);
    if (!valid.ok) return { ok: false, reason: valid.reason };
    return { ok: true, email: hunterEmail, source: "hunter" };
  };

  const mode = emailMode();
  const scrapeOnly = options?.scrapeOnly || mode === "scrape";
  const preferScrape = options?.preferScrape ?? mode !== "hunter";

  if (scrapeOnly || preferScrape) {
    const scraped = await tryScrape();
    if (scraped?.ok) return scraped;
    if (scrapeOnly) return scraped ?? { ok: false, reason: "no_email_found" };
  }

  const hunted = await tryHunter();
  if (hunted?.ok) return hunted;
  const scraped = await tryScrape();
  if (scraped?.ok) return scraped;
  return hunted ?? scraped ?? { ok: false, reason: "no_email_found" };
}
