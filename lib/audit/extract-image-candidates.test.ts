import { describe, expect, it } from "vitest";
import { extractImageCandidates } from "@/lib/audit/analyze-url";

const html = `<!DOCTYPE html><html><head>
<meta property="og:image" content="https://cdn.example.com/og.jpg" />
<meta name="twitter:image" content="/twitter-rel.png" />
</head><body>
<img src="https://img.example.com/a.webp" alt="" />
<img src="/relative/b.jpg" />
<video poster="https://vid.example.com/poster.jpg" src="x"></video>
</body></html>`;

describe("extractImageCandidates", () => {
  it("collects og, twitter, img, and video poster as absolute URLs", () => {
    const base = "https://restaurant.com/menu";
    const found = extractImageCandidates(html, base);
    const urls = found.map((f) => f.url);
    expect(urls).toContain("https://cdn.example.com/og.jpg");
    expect(urls).toContain("https://restaurant.com/twitter-rel.png");
    expect(urls).toContain("https://img.example.com/a.webp");
    expect(urls).toContain("https://restaurant.com/relative/b.jpg");
    expect(urls).toContain("https://vid.example.com/poster.jpg");
    expect(found.find((x) => x.ref === "og_image")?.source).toBe("og:image");
  });

  it("dedupes identical URLs", () => {
    const dup = `<meta property="og:image" content="https://x.com/1.jpg" />
      <img src="https://x.com/1.jpg" />`;
    const found = extractImageCandidates(dup, "https://a.com/");
    expect(found.filter((f) => f.url === "https://x.com/1.jpg").length).toBe(1);
  });
});
