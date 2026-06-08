/**
 * Hospitality content & design tips shown during audit scanning.
 * Inspired by restaurant photography best practices (atmosphere, storytelling, experience).
 * @see https://www.instagram.com/p/DYCoDwCAhEm/
 */

export type AuditScanDesignTip = {
  id: string;
  title: string;
  body: string;
};

/** Rotate every 8s while the grader runs (~54s max → most tips seen). */
export const AUDIT_SCAN_TIP_INTERVAL_MS = 8_000;

export const AUDIT_SCAN_DESIGN_TIPS: AuditScanDesignTip[] = [
  {
    id: "experience-not-only-food",
    title: "Sell the experience, not only the menu",
    body: "Guests book for atmosphere and how it feels to be there—not just a list of dishes. Your site should show that.",
  },
  {
    id: "mix-food-people-interiors",
    title: "Mix food, people & interiors",
    body: "Strong venues balance plated food with the room and real guests. One hero dish alone rarely feels premium.",
  },
  {
    id: "movement-interaction",
    title: "Show movement & interaction",
    body: "Service moments and natural action feel more inviting than stiff, empty table shots.",
  },
  {
    id: "service-moments",
    title: "Use service moments naturally",
    body: "Pouring drinks, plating at the pass, or a warm handoff—small cues signal care before they visit.",
  },
  {
    id: "texture-detail",
    title: "Focus on texture & detail",
    body: "Close-ups of crisp edges, steam, or garnish show quality. Flat, distant food photos under-sell the kitchen.",
  },
  {
    id: "part-of-the-table",
    title: "Make them feel at the table",
    body: "Table-level or first-person framing helps people imagine sitting with you—not browsing a catalogue.",
  },
  {
    id: "story-not-catalogue",
    title: "Tell a story, not a catalogue",
    body: "Premium hospitality content captures mood and interaction—not a grid of identical white-background shots.",
  },
  {
    id: "website-first-impression",
    title: "Your website is the first visit",
    body: "Most guests decide online before they walk in. We're checking whether what they see matches a great night out.",
  },
];

export function pickScanDesignTip(elapsedMs: number): AuditScanDesignTip {
  const tips = AUDIT_SCAN_DESIGN_TIPS;
  if (tips.length === 0) {
    return { id: "fallback", title: "Building your report", body: "Analysing how guests perceive your brand online." };
  }
  const index = Math.floor(elapsedMs / AUDIT_SCAN_TIP_INTERVAL_MS) % tips.length;
  return tips[index]!;
}
