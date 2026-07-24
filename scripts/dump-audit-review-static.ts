/**
 * Writes static .txt audits into public/review/ for tool-readable team review.
 * Usage: npx dotenv -e .env -e .env.local -- npx tsx scripts/dump-audit-review-static.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { renderAuditShareMarkdown } from "../lib/audit/render-share-html";

async function main() {
  const prisma = new PrismaClient();
  const outDir = join(process.cwd(), "public", "review");
  mkdirSync(outDir, { recursive: true });

  const audits = await prisma.visibilityAudit.findMany({
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const indexLines: string[] = [
    "KOB team audit review — STATIC TEXT FILES",
    "Open these URLs (plain text, no JavaScript):",
    "",
  ];

  for (const a of audits) {
    const key = a.slug || a.id;
    const md = renderAuditShareMarkdown({
      id: a.id,
      slug: a.slug,
      restaurantName: a.restaurantName,
      city: a.city,
      websiteUrl: a.websiteUrl,
      overallScore: a.overallScore,
      seoScore: a.seoScore,
      designScore: a.designScore,
      mobileScore: a.mobileScore,
      conversionScore: a.conversionScore,
      resultPayload: a.resultPayload,
    });
    if (!md) continue;
    const file = `${key}.txt`;
    writeFileSync(join(outDir, file), md, "utf8");
    const url = `https://trykob.com/review/${file}`;
    indexLines.push(`${a.restaurantName} — ${a.city}`);
    indexLines.push(url);
    indexLines.push("");
    console.log("wrote", file);
  }

  writeFileSync(join(outDir, "INDEX.txt"), indexLines.join("\n"), "utf8");
  writeFileSync(
    join(outDir, "index.html"),
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>KOB audit review</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}
a{color:#094413}</style></head><body>
<h1>KOB team audit review</h1>
<p>These are <strong>static text files</strong> — open any link. No login. No JavaScript.</p>
<p><a href="/review/INDEX.txt">INDEX.txt (all links)</a></p>
<ul>
${audits
  .map((a) => {
    const key = a.slug || a.id;
    return `<li><a href="/review/${key}.txt">${a.restaurantName}</a> — score ${a.overallScore}</li>`;
  })
  .join("\n")}
</ul>
</body></html>`,
    "utf8",
  );

  await prisma.$disconnect();
  console.log("Done. Open https://trykob.com/review/INDEX.txt after deploy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
