#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(
  path.join(root, "downloads/SaaS-Landing-Page-Template-2/src/App.jsx"),
  "utf8",
);
const outDir = path.join(root, "components/marketing/saas");

function transform(body) {
  return body
    .replace(/\bclass=/g, "className=")
    .replace(
      /<span className="text-xl font-bold text-\[#094413\] tracking-tight transition-colors">\s*owner\s*<span className="text-\[#088924\] font-medium">OS<\/span>\s*<\/span>/g,
      '<span className="text-xl font-bold tracking-tight text-[#094413] transition-colors">KOB</span>',
    )
    .replace(
      /<span className="text-2xl font-bold text-white tracking-tight font-heading">\s*owner\s*<span className="text-\[#088924\] font-medium">OS<\/span>\s*<\/span>/g,
      '<span className="font-heading text-2xl font-bold tracking-tight text-white">KOB</span>',
    )
    .replace(/Owner OS/g, "KOB")
    .replace(/Owner Inc/g, "KOB")
    .replace(/At Owner,/g, "At KOB,")
    .replace(/With Owner,/g, "With KOB,")
    .replace(/expert@owner\.com/g, "/demo")
    .replace(/href="#"/g, 'href="/"')
    .replace(/href="#ordering"/g, 'href="/features/online-ordering"')
    .replace(/href="#apps"/g, 'href="/features/branding"')
    .replace(/href="#success-stories"/g, 'href="/#success-stories"')
    .replace(/href="#ecosystem"/g, 'href="/pricing"')
    .replace(/href="#beliefs"/g, 'href="/resources"')
    .replace(/href="#audit-form"/g, 'href="/#audit-form"')
    .replace(/href="#conversions"/g, 'href="/features/online-ordering"')
    .replace(/<a href="(\/[^"#][^"]*)"([^>]*)>/g, '<Link href="$1"$2>')
    .replace(/<\/a>/g, "</Link>")
    .replace(/<iconify-icon([^>]*?)><\/iconify-icon>/g, "<SaasIcon$1 />")
    .replace(/<iconify-icon([^>]*?)\/>/g, "<SaasIcon$1 />");
}

function writeComponent(name, body, extraImports = "") {
  const content = `"use client";

import Link from "next/link";
import { SaasIcon } from "./SaasIcon";
${extraImports}
export function ${name}() {
  return (
${transform(body)}
  );
}
`;
  fs.writeFileSync(path.join(outDir, `${name}.tsx`), content);
  console.log("Wrote", name);
}

const header = src.match(
  /\/\* =+ HEADER[\s\S]*?<header([\s\S]*?)<\/header>/,
)?.[1];
if (header) {
  writeComponent(
    "SaasMarketingHeader",
    `<header${header}</header>`,
    'import { useState } from "react";\n',
  );
}

const footer = src.match(
  /\/\* =+ FOOTER =+ \*\/([\s\S]*?)<\/footer>/,
)?.[1];
if (footer) writeComponent("SaasMarketingFooter", `${footer}</footer>`);

writeComponent(
  "SaasSuccessStories",
  src.match(/\/\* =+ GROW SALES SUCCESS GALLERY =+ \*\/([\s\S]*?)\/\* =+ VALUE PROPOSITION/)?.[1] ?? "",
);

writeComponent(
  "SaasRatingsMarquee",
  src.match(/\/\* =+ RATINGS & INFINITE MARQUEE BANNER =+ \*\/([\s\S]*?)\/\* =+ BRAND TECH/)?.[1] ?? "",
);

writeComponent(
  "SaasBeliefs",
  src.match(/\/\* =+ THE 3 BELIEFS SECTION =+ \*\/([\s\S]*?)\/\* =+ FINAL CALL TO ACTION/)?.[1] ?? "",
);

writeComponent(
  "SaasFinalCta",
  src.match(/\/\* =+ FINAL CALL TO ACTION =+ \*\/([\s\S]*?)\/\* =+ FOOTER/)?.[1] ?? "",
);

// Ecosystem + Brand need useState
const ecosystem = src.match(
  /\/\* =+ VALUE PROPOSITION[\s\S]*?\/\*\* =+ RATINGS & INFINITE MARQUEE/,
)?.[0]?.replace(/\/\* =+ VALUE PROPOSITION[\s\S]*?\*\/\s*/, "");
if (ecosystem) {
  writeComponent(
    "SaasEcosystemTabs",
    ecosystem,
    'import { useState } from "react";\n',
  );
}

const brand = src.match(
  /\/\* =+ BRAND TECH[\s\S]*?\/\*\* =+ THE 3 BELIEFS/,
)?.[0]?.replace(/\/\* =+ BRAND TECH[\s\S]*?\*\/\s*/, "");
if (brand) {
  writeComponent(
    "SaasBrandGrid",
    brand,
    'import { useState } from "react";\n',
  );
}

console.log("Done");
