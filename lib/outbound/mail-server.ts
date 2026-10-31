import { promises as dns } from "node:dns";

/** The DNS lookups we need, injectable for tests. */
export type MailDns = {
  resolveMx: (domain: string) => Promise<{ exchange: string; priority: number }[]>;
  resolve4: (domain: string) => Promise<string[]>;
};

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);
const code = (e: unknown) => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");

/**
 * Can this address's domain receive mail at all? "no" only when DNS says so: no MX and no A record, or a null MX
 * (RFC 7505). Timeouts and other lookup errors are "unknown", so a DNS hiccup never drops a lead. This catches dead
 * venue domains before they bounce; it can't tell whether one mailbox still exists.
 */
export async function mailServerStatus(email: string, lookup: MailDns = dns): Promise<"yes" | "no" | "unknown"> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return "no";
  try {
    const mx = await lookup.resolveMx(domain);
    if (mx.length === 1 && (mx[0].exchange === "" || mx[0].exchange === ".")) return "no";
    if (mx.length) return "yes";
  } catch (e) {
    if (!NOT_FOUND.has(code(e))) return "unknown";
  }
  try {
    return (await lookup.resolve4(domain)).length ? "yes" : "no";
  } catch (e) {
    return NOT_FOUND.has(code(e)) ? "no" : "unknown";
  }
}
