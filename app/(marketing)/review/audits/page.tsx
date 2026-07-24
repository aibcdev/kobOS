import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "Team audit review · KOB",
  description: "Static plain-text audit files for team review.",
  robots: { index: false, follow: false },
};

/**
 * Points teammates at CDN static .txt files under /public/review/
 * (no Next.js RSC — any tool can fetch them).
 */
export default function TeamAuditReviewPage() {
  let files: string[] = [];
  try {
    files = readdirSync(join(process.cwd(), "public", "review"))
      .filter((f) => f.endsWith(".txt") && f !== "INDEX.txt")
      .sort();
  } catch {
    files = [];
  }

  return (
    <div className="min-h-screen bg-[#f9f3ed] text-[#1a1a1a]">
      <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5c]">KOB · Internal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team audit review</h1>
        <p className="mt-3 text-base leading-relaxed text-[#5c5c5c]">
          Open the <strong>.txt</strong> links — they are static files on the CDN. No login. No JavaScript.
          Review tools that fail on trykob.com pages can still fetch these.
        </p>

        <p className="mt-6 rounded-xl bg-white px-4 py-3 font-mono text-sm break-all shadow-sm">
          <a className="font-semibold text-[#094413] underline" href="/review/INDEX.txt">
            https://trykob.com/review/INDEX.txt
          </a>
        </p>
        <p className="mt-2 text-sm text-[#5c5c5c]">Start with INDEX.txt — it lists every sample audit.</p>

        <p className="mt-8 text-sm font-semibold">Sample (Kingsway Karahi)</p>
        <p className="mt-2 rounded-xl bg-white px-4 py-3 font-mono text-sm break-all shadow-sm">
          <a className="text-[#094413] underline" href="/review/kingsway-karahi-luton.txt">
            https://trykob.com/review/kingsway-karahi-luton.txt
          </a>
        </p>

        <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm">
          {files.map((f) => (
            <li key={f}>
              <a className="text-[#094413] underline" href={`/review/${f}`}>
                /review/{f}
              </a>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-sm text-[#5c5c5c]">
          API fallback (also plain text):{" "}
          <code className="rounded bg-white px-1">/api/audit/{"{id}"}/txt</code>
        </p>
      </div>
    </div>
  );
}
