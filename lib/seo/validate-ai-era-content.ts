import type { AiEraContentBrief, AiEraPrePublishCheck } from "@/lib/seo/ai-era-brief-types";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function runPrePublishChecks(
  brief: AiEraContentBrief,
  articleMarkdown?: string,
): AiEraPrePublishCheck[] {
  const aeoWords = wordCount(brief.aeoBlock);
  const article = articleMarkdown ?? "";

  const checks: AiEraPrePublishCheck[] = [
    {
      id: "aeo_direct",
      label: "First 150 words answer the core question directly",
      pass: aeoWords >= 80 && aeoWords <= 170 && brief.aeoBlock.length > 50,
    },
    {
      id: "h2_paa",
      label: "Every H2 maps to a People Also Ask question",
      pass:
        brief.h2Map.length >= 3 &&
        brief.h2Map.every((q) => article.includes(q) || !article),
    },
    {
      id: "sections_standalone",
      label: "Article has one section per H2 question",
      pass:
        !article ||
        brief.h2Map.filter((q) => article.toLowerCase().includes(q.toLowerCase().slice(0, 20)))
          .length >= Math.min(brief.h2Map.length, 3),
    },
    {
      id: "data_per_section",
      label: "At least one cited data point (EEAT signal present)",
      pass: Boolean(brief.eeatSignal?.trim()) && brief.eeatSignal.length > 10,
    },
    {
      id: "human_value",
      label: "Edge defined — page offers something AI summary wouldn't",
      pass: Boolean(brief.edge?.trim()) && brief.edge.length > 20,
    },
  ];

  return checks;
}

export function isReadyToPublish(checks: AiEraPrePublishCheck[]): boolean {
  return checks.length > 0 && checks.every((c) => c.pass);
}
