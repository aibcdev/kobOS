export function attentionScore(p: {
  impact: number;
  urgency: number;
  confidence: number;
  novelty: number;
  actionability: number;
}): number {
  return (
    p.impact * 0.35 +
    p.urgency * 0.3 +
    p.confidence * 0.15 +
    p.novelty * 0.1 +
    p.actionability * 0.1
  );
}

export function shouldInterrupt(attention: number): boolean {
  return attention >= 80;
}

export type BriefItem = { title: string; handled?: boolean; needsYou?: boolean; noticed?: boolean };

export function formatMorningBrief(items: {
  handled: string[];
  needsYou: string[];
  noticed: string[];
}): string {
  const needs = items.needsYou.slice(0, 5);
  const handled = items.handled.slice(0, 5);
  const noticed = items.noticed.slice(0, 3);
  const lines = ["GOOD MORNING", "", "What KOB handled:"];
  for (const h of handled) lines.push(`✓ ${h}`);
  if (handled.length === 0) lines.push("✓ Nothing verified yet.");
  lines.push("", "What needs you:");
  needs.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  if (needs.length === 0) lines.push("Nothing urgent.");
  if (noticed.length) {
    lines.push("", "What KOB noticed:");
    for (const n of noticed) lines.push(n);
  }
  return lines.join("\n");
}
