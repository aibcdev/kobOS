import { providerName } from "@/lib/hub/capabilities";
import { formatMetric, weekLabel } from "@/lib/roi/format";
import type { WeekSnapshot } from "@/lib/roi/ledger";
import { METRIC_KEYS, METRICS, type MetricKey } from "@/lib/roi/metrics";

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
  const live = METRIC_KEYS.filter((k) => s.metrics[k]?.state === "LIVE").map((k) => ({ key: k, value: formatMetric(s.metrics[k], s.currency, locale)!, count: s.metrics[k].count }));
  const off = METRIC_KEYS.filter((k) => s.metrics[k]?.state === "OFF");
  const v = (k: MetricKey) => live.find((m) => m.key === k);

  const headline = [
    v("net_sales") ? `${v("net_sales")!.value} in sales` : null,
    v("kob_actions")?.count ? `${v("kob_actions")!.value} job${v("kob_actions")!.count === 1 ? "" : "s"} done by KOB` : null,
  ].filter(Boolean);
  const subject = `Your week at ${input.restaurantName}${headline.length ? `: ${headline.join(", ")}` : ""}`;

  const lines = live.map((m) => ({ ...m, label: METRICS[m.key].label, explain: METRICS[m.key].explain, href: link(`/app/roi/${s.weekStart}/${m.key}`) }));
  const offLines = off.map((k) => ({ label: METRICS[k].label, connect: s.metrics[k].connect.slice(0, 2).map(providerName).join(" or ") }));
  const footer = "Every number comes from your own records; tap one to see them. Time saved is an estimate using KOB's standard minutes for each job.";

  const text = [
    `Your week at ${input.restaurantName} (${label})`,
    "",
    ...lines.map((l) => `${l.label}: ${l.value}\n  ${l.explain} ${l.href}`),
    ...(offLines.length ? ["", ...offLines.map((o) => `${o.label}: off. Connect ${o.connect} to see this.`)] : []),
    "",
    footer,
    `Print: ${link(`/app/roi/${s.weekStart}/print`)}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2420">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0;font-size:13px;color:#7a7068">${esc(label)}</p>
<h1 style="margin:6px 0 24px;font-size:24px;font-weight:600">Your week at ${esc(input.restaurantName)}</h1>
${lines
  .map(
    (l) => `<a href="${esc(l.href)}" style="display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e7e1da;border-radius:16px;padding:16px 18px;margin-bottom:10px">
<span style="display:block;font-size:13px;color:#7a7068">${esc(l.label)}</span>
<span style="display:block;font-size:26px;font-weight:600;margin-top:2px">${esc(l.value)}</span>
<span style="display:block;font-size:13px;color:#7a7068;margin-top:4px">${esc(l.explain)}</span></a>`,
  )
  .join("\n")}
${offLines.map((o) => `<p style="font-size:13px;color:#7a7068;margin:8px 0">${esc(o.label)}: off. Connect ${esc(o.connect)} to see this.</p>`).join("\n")}
<p style="font-size:12px;color:#7a7068;margin-top:24px">${esc(footer)}</p>
<p style="font-size:12px;margin-top:8px"><a href="${esc(link(`/app/roi/${s.weekStart}/print`))}" style="color:#7a7068">Printable version</a> · <a href="${esc(link("/app/roi"))}" style="color:#7a7068">Open in KOB</a></p>
</div></body></html>`;

  return { subject, html, text, allowed: [...live.map((m) => m.value), label] };
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
