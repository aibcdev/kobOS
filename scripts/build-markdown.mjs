#!/usr/bin/env node
/**
 * Markdown copies of every public page, plus /llms.txt and /llms-full.txt (llmstxt.org), for assistants and search
 * tools that read and cite trykob.com.
 *
 * Runs after `next build`: starts the built site locally, reads /sitemap.xml, fetches each page as a visitor would,
 * keeps only the page content and converts it to Markdown. The source is the rendered HTML itself, so the copies
 * can't drift from the site. Files land in public/ (git-ignored) before Netlify publishes it.
 *
 *   node scripts/build-markdown.mjs                          # after `next build`
 *   MARKDOWN_SOURCE_URL=http://localhost:3000 node scripts/build-markdown.mjs   # against a running server
 *   MARKDOWN_STRICT=1 …                                      # exit 1 on any page that fails (CI)
 *
 * Page rules match lib/marketing/markdown-pages.ts (home → /index.md, /pricing → /pricing.md; checked by its test).
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";
import TurndownService from "turndown";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = (process.env.MARKDOWN_SITE_URL || "https://trykob.com").replace(/\/$/, "");
const STRICT = process.env.MARKDOWN_STRICT === "1";
const PORT = Number(process.env.MARKDOWN_PORT || 3457);
const SKIPPED = new Set(["/go/audit", "/scan"]);

const SUMMARY =
  "KOB is the restaurant manager for independent restaurants and cafés. It reads your reviews and drafts the replies, drafts fixes to your Google listing, and sends a morning brief of what needs you today. You approve, tap once, and post. Nothing goes out without your OK. 7-day free trial, no card.";

export const markdownPathFor = (p) => (p === "/" ? "/index.md" : `${p.replace(/\/$/, "")}.md`);

// ---- HTML → Markdown ----------------------------------------------------------------------------

const REMOVE = [
  "script", "style", "noscript", "template", "iframe", "svg", "canvas", "video", "audio", "link", "meta", "img", "picture", "figure",
  "nav", "header", "footer", "form", "button", "input", "select", "textarea", "dialog",
  "[aria-hidden=true]", "[role=dialog]", "[role=navigation]",
];
const NOISE = /cookie|consent|gdpr|popup|modal|newsletter|chat-widget|intercom|toast/i;

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });

const clean = (s) => s.replace(/\s+/g, " ").trim();

/** Title, description and Markdown body of one rendered page. */
export function pageToMarkdown(html, pagePath) {
  const doc = parse(html, { comment: false });
  const h1 = clean(doc.querySelector("h1")?.textContent || "");
  // "Pricing | KOB — …" → "Pricing". A title that is only the brand ("KOB — …") falls back to the page headline.
  const named = clean(doc.querySelector("title")?.textContent || "").split(/\s+[|·]\s+/)[0].replace(/\s+[–—]\s+KOB$/, "");
  const title = (pagePath === "/" ? "KOB" : !named || /^KOB\b/.test(named) ? h1 : named) || pagePath;
  const description = clean(doc.querySelector('meta[name="description"]')?.getAttribute("content") || "");
  const root = doc.querySelector("main") || doc.querySelector("body") || doc;
  // Accordion toggles hold the question (FAQ); the collapsed answers are still in the page and are kept.
  for (const el of root.querySelectorAll("button[aria-controls], button[aria-expanded], summary")) {
    const q = clean(el.textContent);
    if (q) el.replaceWith(parse(`<h3>${q.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</h3>`));
  }
  for (const sel of REMOVE) for (const el of root.querySelectorAll(sel)) el.remove();
  for (const el of root.querySelectorAll("[class],[id]")) if (NOISE.test(`${el.getAttribute("class") || ""} ${el.getAttribute("id") || ""}`)) el.remove();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/") && !href.startsWith("//")) a.setAttribute("href", `${SITE}${href}`);
    if (!clean(a.textContent)) a.remove();
  }
  let body = turndown
    .turndown(root.innerHTML)
    // Buttons side by side come out as "[A](x)[B](y)": keep them readable.
    .replace(/\)\[/g, ") · [")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  // The page's own H1 becomes the document title below; don't repeat it.
  body = body.replace(new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`), "");
  const markdown = [`# ${title}`, description ? `> ${description}` : "", `Source: ${SITE}${pagePath === "/" ? "/" : pagePath}`, body]
    .filter(Boolean)
    .join("\n\n");
  return { title, description, markdown: `${markdown}\n` };
}

// ---- llms.txt -----------------------------------------------------------------------------------

function section(p) {
  if (p === "/privacy" || p === "/terms") return "Optional";
  if (p.startsWith("/features/")) return "Features";
  if (p === "/resources" || p.startsWith("/resources/")) return "Guides and comparisons";
  return "Main pages";
}

export function llmsTxt(pages) {
  const order = ["Main pages", "Features", "Guides and comparisons", "Optional"];
  const lines = ["# KOB", "", `> ${SUMMARY}`, ""];
  for (const name of order) {
    const items = pages.filter((p) => section(p.path) === name);
    if (!items.length) continue;
    lines.push(`## ${name}`, "");
    for (const p of items) lines.push(`- [${p.title}](${SITE}${markdownPathFor(p.path)})${p.description ? `: ${p.description}` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function llmsFullTxt(pages) {
  return [`# KOB`, "", `> ${SUMMARY}`, "", ...pages.map((p) => `---\n\n${p.markdown}`)].join("\n");
}

// ---- Build --------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "ignore", "inherit"],
  });
  const origin = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) })).ok) return { origin, stop: () => child.kill("SIGTERM") };
    } catch {
      // not up yet
    }
    if (child.exitCode !== null) throw new Error(`next start exited with ${child.exitCode}`);
    await sleep(500);
  }
  child.kill("SIGTERM");
  throw new Error("next start didn't answer within 60s");
}

async function main() {
  const external = process.env.MARKDOWN_SOURCE_URL?.replace(/\/$/, "");
  const server = external ? { origin: external, stop: () => {} } : await startServer();
  const failed = [];
  try {
    const sitemap = await (await fetch(`${server.origin}/sitemap.xml`)).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1].trim()).pathname.replace(/\/$/, "") || "/")
      .filter((p) => !SKIPPED.has(p));
    const pages = [];
    for (const p of [...new Set(paths)]) {
      try {
        const res = await fetch(`${server.origin}${p}`, { redirect: "follow", signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "KOB markdown build" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const page = { path: p, ...pageToMarkdown(await res.text(), p) };
        pages.push(page);
        const file = path.join(PUBLIC, markdownPathFor(p));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, page.markdown);
      } catch (e) {
        failed.push(`${p} (${e instanceof Error ? e.message : e})`);
      }
    }
    await writeFile(path.join(PUBLIC, "llms.txt"), llmsTxt(pages));
    await writeFile(path.join(PUBLIC, "llms-full.txt"), llmsFullTxt(pages));
    console.log(`[markdown] ${pages.length} pages → public/*.md, llms.txt, llms-full.txt${failed.length ? `; ${failed.length} failed: ${failed.join(", ")}` : ""}`);
  } finally {
    server.stop();
  }
  if (failed.length && STRICT) process.exit(1);
}

// Run only as a script, so the test can import the helpers.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async (e) => {
    console.error(`[markdown] skipped: ${e instanceof Error ? e.message : e}`);
    // Never ship a stale hand-written copy: without a fresh build there are no Markdown files at all.
    await Promise.all(["llms.txt", "llms-full.txt"].map((f) => rm(path.join(PUBLIC, f), { force: true })));
    process.exit(STRICT ? 1 : 0);
  });
}
