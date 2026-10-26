import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { llmsFullTxt, llmsTxt, markdownPathFor as scriptPathFor, pageToMarkdown } from "@/scripts/build-markdown.mjs";
import { MARKDOWN_SKIPPED_PATHS, markdownPathFor } from "./markdown-pages";

const sitemapPaths = () => sitemap().map((e) => new URL(e.url).pathname.replace(/\/$/, "") || "/");

describe("Markdown copies of public pages", () => {
  it("every sitemap page has a copy, at the same URL the <link rel=alternate> points to", () => {
    const skipped = new Set<string>(MARKDOWN_SKIPPED_PATHS);
    for (const p of sitemapPaths().filter((p) => !skipped.has(p))) {
      expect(markdownPathFor(p), p).not.toBeNull();
      expect(markdownPathFor(p)).toBe(scriptPathFor(p));
    }
    expect(markdownPathFor("/")).toBe("/index.md");
    expect(markdownPathFor("/login")).toBeNull();
    expect(markdownPathFor("/app")).toBeNull();
  });

  const html = `<!doctype html><html><head><title>Pricing | KOB — The Restaurant Manager</title>
<meta name="description" content="One price per location. 7 days free, no card.">
<script>window.track=1</script><style>.x{}</style></head><body>
<header><nav><a href="/">Home</a><a href="/pricing">Pricing</a></nav></header>
<main>
  <h1>Pricing</h1>
  <p>£79/mo in the UK, $99/mo elsewhere. <a href="/trial">Start your trial</a></p>
  <h2>What's included</h2><ul><li>Review replies</li><li>Google listing</li></ul>
  <section aria-label="FAQ"><h2>FAQ</h2><ul>
    <li><button aria-expanded="true" aria-controls="a0">Is there a contract?<svg aria-hidden="true"></svg></button><div id="a0" role="region">No contract.</div></li>
    <li><button aria-expanded="false" aria-controls="a1">Do I need a card?</button><div id="a1" role="region" hidden>No card for the trial.</div></li>
  </ul></section>
  <form><input name="email"><button>Get started</button></form>
  <div class="cookie-banner">We use cookies</div>
  <img src="/hero.jpg" alt="Hero"><svg><path d="M0"/></svg>
</main>
<footer>© KOB</footer><script src="/analytics.js"></script></body></html>`;

  it("keeps the content (headings, lists, prices, FAQ) and drops scripts, menus, forms and banners", () => {
    const { title, description, markdown } = pageToMarkdown(html, "/pricing");
    expect(title).toBe("Pricing");
    expect(description).toBe("One price per location. 7 days free, no card.");
    expect(markdown).toBe(
      [
        "# Pricing",
        "",
        "> One price per location. 7 days free, no card.",
        "",
        "Source: https://trykob.com/pricing",
        "",
        "£79/mo in the UK, $99/mo elsewhere. [Start your trial](https://trykob.com/trial)",
        "",
        "## What's included",
        "",
        "-   Review replies",
        "-   Google listing",
        "",
        "## FAQ",
        "",
        "-   ### Is there a contract?",
        "",
        "    No contract.",
        "",
        "-   ### Do I need a card?",
        "",
        "    No card for the trial.",
        "",
      ].join("\n"),
    );
    expect(markdown).not.toMatch(/track|analytics|cookies|Get started|Home|© KOB|hero/i);
  });

  it("writes llms.txt in the llmstxt.org shape, and llms-full.txt with every page", () => {
    const page = { path: "/pricing", ...pageToMarkdown(html, "/pricing") };
    const home = { path: "/", title: "Your restaurant's new manager", description: "Reviews, Google listing, posts and offers.", markdown: "# Home\n" };
    const terms = { path: "/terms", title: "Terms", description: "", markdown: "# Terms\n" };
    const txt = llmsTxt([home, page, terms]);
    expect(txt.split("\n").slice(0, 3)).toEqual(["# KOB", "", expect.stringMatching(/^> KOB is the restaurant manager .*You approve, tap once, and post\. Nothing goes out without your OK\. 7-day free trial, no card\.$/)]);
    expect(txt).toContain("## Main pages\n\n- [Your restaurant's new manager](https://trykob.com/index.md): Reviews, Google listing, posts and offers.\n- [Pricing](https://trykob.com/pricing.md): One price per location. 7 days free, no card.");
    expect(txt).toContain("## Optional\n\n- [Terms](https://trykob.com/terms.md)");
    const full = llmsFullTxt([home, page]);
    expect(full).toContain("# Pricing");
    expect(full).toContain("# Home");
  });
});
