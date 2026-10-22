/** RFC 4180 CSV: quoted fields, doubled quotes, CR/LF/CRLF, BOM. Delimiter is sniffed from the header line (, ; tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delim = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Header row → objects keyed by trimmed header. Statements often have a title block, so the header is the first row
 *  with at least `minColumns` non-empty cells. */
export function csvRecords(text: string, minColumns = 3): { headers: string[]; records: Record<string, string>[] } {
  const rows = parseCsv(text);
  const start = rows.findIndex((r) => r.filter((c) => c.trim()).length >= minColumns);
  if (start < 0) return { headers: [], records: [] };
  const headers = rows[start].map((h) => h.trim());
  const records = rows.slice(start + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, records };
}

/** "£1,234.50", "(12.00)", "-3", "12,50" (EU) → number; null when blank or not a number. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
  s = s.replace(/[()\s£$€]|[A-Z]{3}/g, "").replace(/^-|-$/g, "");
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n) || s === "") return null;
  return negative ? -n : n;
}

/**
 * "2026-10-14", "14/10/2026", "10/14/2026" (when `monthFirst`), "14 Oct 2026", optionally with "19:42[:05]" → local
 * wall-clock "YYYY-MM-DDTHH:mm:ss", or null.
 */
export function parseLocalDateTime(rawDate: string | undefined, rawTime?: string, monthFirst = false): string | null {
  if (!rawDate?.trim()) return null;
  const s = rawDate.trim();
  let y: number, m: number, d: number;
  let rest = "";
  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](.*))?$/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    rest = match[4] ?? "";
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T,]+(.*))?$/))) {
    const [a, b] = [Number(match[1]), Number(match[2])];
    [d, m] = monthFirst ? [b, a] : [a, b];
    if (m > 12 && d <= 12) [d, m] = [m, d];
    y = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    rest = match[4] ?? "";
  } else if ((match = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})(?:[ ,]+(.*))?$/))) {
    const mi = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase());
    if (mi < 0) return null;
    [y, m, d] = [Number(match[3]), mi + 1, Number(match[1])];
    rest = match[4] ?? "";
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = (rawTime?.trim() || rest).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?/i);
  let hh = t ? Number(t[1]) : 0;
  if (t?.[4]) hh = (hh % 12) + (t[4].toLowerCase() === "pm" ? 12 : 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${t ? t[2] : "00"}:${t?.[3] ?? "00"}`;
}
