/**
 * Product emails to owners: plain, warm, short. Every link opens the app (login required). No email claims
 * something happened unless it did, and none uses the banned words in lib/copy/banned-words.
 */

export type Email = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Block = { kind: "p"; text: string } | { kind: "list"; items: { text: string; href?: string }[] } | { kind: "button"; text: string; href: string };

function render(title: string, blocks: Block[]): Email & { subject: string } {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1ea;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2420">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 20px;font:600 13px/1 system-ui,sans-serif;letter-spacing:.08em;color:#7a6a5c">KOB</p>
<h1 style="font:500 24px/1.25 Georgia,serif;margin:0 0 16px">${esc(title)}</h1>
${blocks
  .map((b) => {
    if (b.kind === "p") return `<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${esc(b.text)}</p>`;
    if (b.kind === "button")
      return `<p style="margin:20px 0"><a href="${esc(b.href)}" style="display:inline-block;background:#2b2420;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">${esc(b.text)}</a></p>`;
    return `<ul style="padding-left:20px;margin:0 0 14px">${b.items
      .map((i) => `<li style="font-size:15px;line-height:1.5;margin:0 0 6px">${i.href ? `<a href="${esc(i.href)}" style="color:#2b2420">${esc(i.text)}</a>` : esc(i.text)}</li>`)
      .join("")}</ul>`;
  })
  .join("\n")}
<p style="font-size:12px;color:#7a6a5c;margin:28px 0 0">You're getting this because you run this restaurant on KOB.</p>
</div></body></html>`;
  const text = [
    title,
    "",
    ...blocks.map((b) =>
      b.kind === "p" ? b.text : b.kind === "button" ? `${b.text}: ${b.href}` : b.items.map((i) => `- ${i.text}${i.href ? ` (${i.href})` : ""}`).join("\n"),
    ),
  ].join("\n\n");
  return { subject: title, html, text };
}

export type Links = { app: string; billing: string; action: (id: string) => string; reviews: string; connections: string };

export function links(appUrl: string, restaurantId: string): Links {
  const base = appUrl.replace(/\/$/, "");
  const r = `?r=${encodeURIComponent(restaurantId)}`;
  return {
    app: `${base}/app${r}`,
    billing: `${base}/dashboard/billing${r}`,
    action: (id) => `${base}/app/actions/${encodeURIComponent(id)}${r}`,
    reviews: `${base}/app/reviews${r}`,
    connections: `${base}/app/settings/connections${r}`,
  };
}

export function welcomeEmail(p: { name: string; trialEnds: string; price: string; links: Links }): Email {
  return render(`Welcome to KOB, ${p.name}`, [
    { kind: "p", text: "From tomorrow morning KOB looks after your reviews, your Google listing, and posts and offers for your quieter nights. Each morning you'll get a short brief; nothing goes public until you tap approve." },
    { kind: "p", text: `Your free trial runs until ${p.trialEnds}. No card needed. After that it's ${p.price} a month per location if you'd like to keep going.` },
    { kind: "p", text: "First step: connect your Google listing, so KOB can read your reviews and hours." },
    { kind: "button", text: "Open KOB", href: p.links.app },
  ]);
}

export function dailyBriefEmail(p: {
  name: string;
  greeting: string;
  needToKnow: string[];
  approvals: { id: string; title: string }[];
  tasks: string[];
  links: Links;
}): Email {
  const blocks: Block[] = [{ kind: "p", text: p.greeting }];
  if (p.needToKnow.length) blocks.push({ kind: "list", items: p.needToKnow.map((t) => ({ text: t })) });
  if (p.approvals.length) {
    blocks.push({ kind: "p", text: `Ready for your yes (${p.approvals.length}):` });
    blocks.push({ kind: "list", items: p.approvals.slice(0, 8).map((a) => ({ text: a.title, href: p.links.action(a.id) })) });
  }
  if (p.tasks.length) {
    blocks.push({ kind: "p", text: "Also on today's list:" });
    blocks.push({ kind: "list", items: p.tasks.slice(0, 6).map((t) => ({ text: t })) });
  }
  blocks.push({ kind: "button", text: "Open today's list", href: p.links.app });
  const count = p.approvals.length + p.tasks.length;
  const e = render(`${p.name}: ${count} thing${count === 1 ? "" : "s"} for you today`, blocks);
  return e;
}

export function weeklySummaryEmail(p: { name: string; reviewsThisWeek: number; reviewsLastWeek: number; published: number; waiting: number; links: Links }): Email {
  return render(`${p.name}: your week`, [
    { kind: "list", items: [
      { text: `${p.reviewsThisWeek} new review${p.reviewsThisWeek === 1 ? "" : "s"} (the week before: ${p.reviewsLastWeek})`, href: p.links.reviews },
      { text: `${p.published} change${p.published === 1 ? "" : "s"} you approved went live and KOB checked ${p.published === 1 ? "it" : "them"}` },
      { text: `${p.waiting} waiting for your yes` },
    ] },
    { kind: "button", text: "Open KOB", href: p.links.app },
  ]);
}

export function trialEndingEmail(p: { name: string; ends: string; price: string; links: Links }): Email {
  return render(`Your free trial ends ${p.ends}`, [
    { kind: "p", text: `KOB has been looking after ${p.name} for five days. Your free trial ends ${p.ends}.` },
    { kind: "p", text: `To keep it going, add a card: ${p.price} a month per location, cancel any time. If you don't, KOB pauses when the trial ends — your data is kept and nothing is charged.` },
    { kind: "button", text: "Add a card", href: p.links.billing },
  ]);
}

export function trialEndedEmail(p: { name: string; price: string; links: Links }): Email {
  return render(`Your free trial has ended`, [
    { kind: "p", text: `KOB is paused for ${p.name}. Your reviews, listing history and house rules are all kept, but nothing new is drafted or published. Nothing has been charged.` },
    { kind: "p", text: `Add a card to pick up where you left off — ${p.price} a month per location.` },
    { kind: "button", text: "Add a card", href: p.links.billing },
  ]);
}

export function publishedEmail(p: { name: string; title: string; where: string; actionId: string; links: Links }): Email {
  return render(`Done: ${p.title}`, [
    { kind: "p", text: `You approved it, KOB published it to ${p.where}, then checked it's showing.` },
    { kind: "button", text: "See it in KOB", href: p.links.action(p.actionId) },
  ]);
}

export function reconnectGoogleEmail(p: { name: string; links: Links }): Email {
  return render(`Reconnect Google for ${p.name}`, [
    { kind: "p", text: "Google stopped letting KOB read your listing (this happens when a password changes or access is removed). Until you reconnect, KOB can't see new reviews or keep your hours right." },
    { kind: "button", text: "Reconnect Google", href: p.links.connections },
  ]);
}
