/**
 * The link and outreach log (data/link-log.csv): roundup pitches, journalist answers, tool outreach, unlinked
 * mentions, vendor stories and listings, so nobody pitches the same thing twice and earned links can be rechecked.
 * Pure helpers shared by scripts/link-log-check.ts, scripts/redirect-audit.ts and the tests.
 */

export const LINK_LOG_COLUMNS = [
  "date",
  "type",
  "target_url",
  "contact",
  "our_url",
  "status",
  "live_link_url",
  "anchor_text",
  "notes",
] as const;

export const LINK_TYPES = ["roundup", "journalist", "tool-outreach", "unlinked-mention", "vendor-story", "listing"] as const;
export const LINK_STATUSES = ["pitched", "replied", "live", "declined"] as const;

export type LinkLogRow = Record<(typeof LINK_LOG_COLUMNS)[number], string>;

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), (field = "");
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** Rows keyed by column, plus problems (wrong header, unknown type or status, live without a link). */
export function readLinkLog(text: string): { rows: LinkLogRow[]; problems: string[] } {
  const [header, ...body] = parseCsv(text);
  const problems: string[] = [];
  if (!header || header.join(",") !== LINK_LOG_COLUMNS.join(",")) {
    return { rows: [], problems: [`header must be: ${LINK_LOG_COLUMNS.join(",")}`] };
  }
  const rows = body.map((cells) => Object.fromEntries(LINK_LOG_COLUMNS.map((k, i) => [k, (cells[i] ?? "").trim()])) as LinkLogRow);
  rows.forEach((r, i) => {
    const line = i + 2;
    if (!(LINK_TYPES as readonly string[]).includes(r.type)) problems.push(`line ${line}: unknown type "${r.type}"`);
    if (!(LINK_STATUSES as readonly string[]).includes(r.status)) problems.push(`line ${line}: unknown status "${r.status}"`);
    if (r.status === "live" && !/^https?:\/\//.test(r.live_link_url)) problems.push(`line ${line}: live but no live_link_url`);
  });
  return { rows, problems };
}

/** Does this page link to `host` (or a subdomain) with a real <a href>? */
export function linksTo(html: string, host = "trykob.com"): boolean {
  const escaped = host.replace(/\./g, "\\.");
  return new RegExp(`<a\\s[^>]*href\\s*=\\s*["']?https?://([a-z0-9-]+\\.)*${escaped}(?=[/"'?#\\s>:]|$)`, "i").test(html);
}

/** Disallow rules for User-agent: * (or our agent) from a robots.txt; enough for a polite one-page fetch. */
export function robotsAllows(robotsTxt: string, path: string, agent = "kob-link-check"): boolean {
  let applies = false;
  let seenRuleForGroup = false;
  const disallow: string[] = [];
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, value] = m;
    if (key.toLowerCase() === "user-agent") {
      if (seenRuleForGroup) (applies = false), (seenRuleForGroup = false);
      if (value === "*" || agent.toLowerCase().includes(value.toLowerCase())) applies = true;
    } else {
      seenRuleForGroup = true;
      if (applies && key.toLowerCase() === "disallow" && value) disallow.push(value);
    }
  }
  return !disallow.some((rule) => path.startsWith(rule.replace(/\*.*$/, "")));
}

/** A redirect path is fine with at most one hop that ends on a 200. */
export function redirectProblem(hops: Array<{ url: string; status: number }>): string | null {
  const last = hops[hops.length - 1];
  if (!last) return "no response";
  const redirects = hops.length - 1;
  if (last.status !== 200) return `ends on ${last.status}`;
  if (redirects > 1) return `${redirects} hops: ${hops.map((h) => `${h.status} ${h.url}`).join(" → ")}`;
  return null;
}
