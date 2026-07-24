import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";

const BLOCKED_EMAIL_DOMAINS = new Set([
  "wixpress.com",
  "sentry-next.wixpress.com",
  "sentry.io",
  "deliveroo.com",
  "deliveroo.fr",
  "ubereats.com",
  "just-eat.co.uk",
  "justeat.com",
  "example.com",
  "email.com",
  "domain.com",
  "yoursite.com",
  "mysite.com",
  "godaddy.com",
  "squarespace.com",
  "wordpress.com",
  "instagram.com",
  "facebook.com",
]);

/** Owners often list personal inboxes on their site — allow when scraped from their pages. */
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "aol.com",
  "protonmail.com",
  "proton.me",
]);

const BLOCKED_LOCAL = new Set(["noreply", "no-reply", "donotreply", "donotreply", "privacy", "abuse"]);

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function hostsAlign(emailDomain: string, websiteHost: string): boolean {
  const a = normalizeHost(emailDomain);
  const b = normalizeHost(websiteHost);
  if (a === b) return true;
  if (a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return true;

  const aRoot = a.split(".").slice(-2).join(".");
  const bRoot = b.split(".").slice(-2).join(".");
  return aRoot.length > 3 && aRoot === bRoot;
}

export function isValidProspectEmail(
  email: string,
  websiteUrl: string | null,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return { ok: false, reason: "invalid_email" };

  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return { ok: false, reason: "invalid_email" };
  if (BLOCKED_LOCAL.has(local)) return { ok: false, reason: "blocked_local" };
  if (/^[a-f0-9]{24,}$/.test(local)) return { ok: false, reason: "junk_local" };

  const domainRoot = domain.split(".").slice(-2).join(".");
  if (BLOCKED_EMAIL_DOMAINS.has(domain) || BLOCKED_EMAIL_DOMAINS.has(domainRoot)) {
    return { ok: false, reason: "blocked_domain" };
  }
  if (domain.includes("wixpress") || domain.includes("sentry")) {
    return { ok: false, reason: "blocked_domain" };
  }

  const websiteHost = hostFromWebsiteUrl(websiteUrl);
  const isPersonalInbox = PERSONAL_EMAIL_DOMAINS.has(domain) || PERSONAL_EMAIL_DOMAINS.has(domainRoot);
  if (websiteHost && !isPersonalInbox && !hostsAlign(domain, websiteHost)) {
    return { ok: false, reason: "domain_mismatch" };
  }

  return { ok: true };
}
