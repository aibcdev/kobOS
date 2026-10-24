import { providerName } from "@/lib/hub/capabilities";
import { formatMetric, weekLabel } from "@/lib/roi/format";
import type { WeekSnapshot } from "@/lib/roi/ledger";
import { KOB_VALUE_EMPTY, METRIC_GROUPS, METRICS, showsAsEmpty, type MetricKey } from "@/lib/roi/metrics";

/**
 * Spec 2 Phase 9 weekly email. Every figure in it is a formatted value from the saved RoiWeek snapshot; the number
 * guard refuses to send if any other digit appears, so a template edit can never slip an invented number in.
 */

export type WeeklyEmail = { subject: string; html: string; text: string; allowed: string[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function weeklyEmail(input: { restaurantName: string; restaurantId: string; snapshot: WeekSnapshot; locale: string; appUrl: string }): WeeklyEmail {
  const { snapshot: s, locale } = input;
  const label = weekLabel(s.weekStart, locale);
  const link = (path: string) => `${input.appUrl}${path}${path.includes("?") ? "&" : "?"}r=${encodeURIComponent(input.restaurantId)}`;
  const shown = (k: MetricKey) => s.metrics[k]?.state === "LIVE" && !showsAsEmpty(k, s.metrics[k]);
  const line = (k: MetricKey) => ({
    key: k,
    value: formatMetric(s.metrics[k], s.currency, locale)!,
    label: METRICS[k].label,
    explain: METRICS[k].explain,
    href: link(`/app/roi/${s.weekStart}/${k}`),
  });

  const groups = METRIC_GROUPS.map((g) => ({
    ...g,
    lines: g.metrics.filter(shown).map(line),
    off: g.metrics
      .filter((k) => s.metrics[k]?.state === "OFF")
      .map((k) => ({ label: METRICS[k].label, connect: s.metrics[k].connect.slice(0, 2).map(providerName).join(" or ") })),
    empty: g.metrics.some((k) => showsAsEmpty(k, s.metrics[k])) ? KOB_VALUE_EMPTY : null,
  }));
  const lines = groups.flatMap((g) => g.lines);

  const kobValue = lines.find((l) => l.key === "kob_value");
  const subject = `Your week at ${input.restaurantName}${kobValue ? `: ${kobValue.value} verified from KOB` : ""}`;
  const footer = "Every number comes from your own records; tap one to see them. Time saved is an estimate using KOB's standard minutes for each job.";

  const text = [
    `Your week at ${input.restaurantName} (${label})`,
    ...groups.flatMap((g) => [
      "",
      g.title.toUpperCase(),
      g.blurb,
      ...g.lines.map((l) => `${l.label}: ${l.value}\n  ${l.explain} ${l.href}`),
      ...g.off.map((o) => `${o.label}: off. Connect ${o.connect} to see this.`),
      ...(g.empty ? [g.empty] : []),
    ]),
    "",
    footer,
    `Print: ${link(`/app/roi/${s.weekStart}/print`)}`,
  ].join("\n");

  const card = (l: (typeof lines)[number]) => `<a href="${esc(l.href)}" style="display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e7e1da;border-radius:16px;padding:16px 18px;margin-bottom:10px">
<span style="display:block;font-size:13px;color:#7a7068">${esc(l.label)}</span>
<span style="display:block;font-size:26px;font-weight:600;margin-top:2px">${esc(l.value)}</span>
<span style="display:block;font-size:13px;color:#7a7068;margin-top:4px">${esc(l.explain)}</span></a>`;
  const muted = (t: string) => `<p style="font-size:13px;color:#7a7068;margin:8px 0">${esc(t)}</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2420">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0;font-size:13px;color:#7a7068">${esc(label)}</p>
<h1 style="margin:6px 0 8px;font-size:24px;font-weight:600">Your week at ${esc(input.restaurantName)}</h1>
${groups
  .map(
    (g) => `<h2 style="margin:24px 0 4px;font-size:16px;font-weight:600">${esc(g.title)}</h2>
${muted(g.blurb)}
${g.lines.map(card).join("\n")}
${g.off.map((o) => muted(`${o.label}: off. Connect ${o.connect} to see this.`)).join("\n")}
${g.empty ? muted(g.empty) : ""}`,
  )
  .join("\n")}
<p style="font-size:12px;color:#7a7068;margin-top:24px">${esc(footer)}</p>
<p style="font-size:12px;margin-top:8px"><a href="${esc(link(`/app/roi/${s.weekStart}/print`))}" style="color:#7a7068">Printable version</a> · <a href="${esc(link("/app/roi"))}" style="color:#7a7068">Open in KOB</a></p>
</div></body></html>`;

  return { subject, html, text, allowed: [...lines.map((l) => l.value), label] };
}

/**
 * Strips every allowed figure, plus the restaurant name, URLs and markup, from the rendered text; any digit left is a
 * number that didn't come from the snapshot.
 */
export function numberGuard(rendered: string, allowed: string[], alsoAllow: string[] = []): { ok: boolean; stray: string[] } {
  let rest = rendered.replace(/https?:\/\/[^\s"<>]+/g, " ").replace(/<[^>]+>/g, " ");
  for (const a of [...allowed, ...alsoAllow].filter(Boolean).sort((x, y) => y.length - x.length)) {
    rest = rest.split(a).join(" ");
    rest = rest.split(esc(a)).join(" ");
  }
  const stray = rest.match(/[^\s]*\d[^\s]*/g) ?? [];
  return { ok: stray.length === 0, stray };
}

/** Checks subject, text and HTML together. */
export function guardEmail(email: WeeklyEmail, restaurantName: string): { ok: boolean; stray: string[] } {
  const parts = [email.subject, email.text, email.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/style="[^"]*"/g, "")];
  const stray = parts.flatMap((p) => numberGuard(p, email.allowed, [restaurantName]).stray);
  return { ok: stray.length === 0, stray };
}
