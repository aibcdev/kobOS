import type { MemoryItem } from "@/lib/kob/demo-data";
import type { Restaurant } from "@/lib/kob/demo-data";

/** How the owner prefers KOB to speak — learned from Talk, never assumed forever. */
export type TalkStyle = "short" | "guided" | "propose";

export function talkStyleFromMemory(memory: MemoryItem[]): TalkStyle | null {
  for (const m of memory) {
    const blob = `${m.text} ${m.learned}`.toLowerCase();
    if (/talk.?style:\s*short|keep it short|brief only/.test(blob)) return "short";
    if (/talk.?style:\s*guided|walk me through/.test(blob)) return "guided";
    if (/talk.?style:\s*propose|just propose/.test(blob)) return "propose";
  }
  return null;
}

export function ownerNameLine(restaurant: Restaurant): string {
  return restaurant.name?.trim() || "your restaurant";
}

/** Soft first-name feel without inventing a person. */
export function addressOwner(style: TalkStyle | null): string {
  if (style === "short") return "";
  return "";
}

/**
 * Shape a operator message to the owner's preferred density.
 * Always keep facts — only trim scaffolding when they asked for short.
 */
export function shapeForOwner(
  style: TalkStyle | null,
  parts: { lead: string; detail?: string; ask?: string },
): string {
  const chunks: string[] = [parts.lead.trim()];
  if (style !== "short" && parts.detail?.trim()) chunks.push(parts.detail.trim());
  if (parts.ask?.trim()) chunks.push(parts.ask.trim());
  if (style === "guided" && parts.detail) {
    return chunks.join("\n\n");
  }
  if (style === "short") {
    return [parts.lead.trim(), parts.ask?.trim()].filter(Boolean).join("\n\n");
  }
  return chunks.filter(Boolean).join("\n\n");
}

export const TALK_STYLE_CHIPS = [
  { id: "talk-style-short", label: "Keep it short", kind: "yes" as const },
  { id: "talk-style-guided", label: "Walk me through", kind: "yes" as const },
  { id: "talk-style-propose", label: "Just propose — I'll approve", kind: "yes" as const },
];
