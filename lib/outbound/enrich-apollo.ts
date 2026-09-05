import { hostFromWebsiteUrl } from "@/lib/outbound/chain-denylist";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

type ApolloPerson = {
  email?: string | null;
  email_status?: string | null;
  title?: string | null;
};

/**
 * Apollo org-domain people search — owner/GM inboxes when Hunter/scrape miss.
 * Uses REST master key (APOLLO_API_KEY), not Harbor MCP.
 */
export async function enrichViaApollo(websiteUrl: string | null): Promise<string | null> {
  const key = process.env.APOLLO_API_KEY?.trim();
  const host = hostFromWebsiteUrl(websiteUrl);
  if (!key || !host) return null;

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "X-Api-Key": key,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      q_organization_domains: [host.replace(/^www\./, "")],
      page: 1,
      per_page: 10,
      person_titles: [
        "owner",
        "founder",
        "managing director",
        "general manager",
        "restaurant manager",
      ],
    }),
  });

  if (!res.ok) {
    console.warn("[outbound] apollo HTTP", res.status);
    return null;
  }

  const json = (await res.json()) as { people?: ApolloPerson[]; contacts?: ApolloPerson[] };
  const people = [...(json.people ?? []), ...(json.contacts ?? [])];
  const emails = people
    .map((p) => p.email?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e) && !e.includes("email_not_unlocked") && e.includes("@"));

  for (const email of emails) {
    if (isValidProspectEmail(email, websiteUrl).ok) return email;
  }
  return null;
}
