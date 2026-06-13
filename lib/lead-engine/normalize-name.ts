/** Normalize restaurant name for cross-platform dedup. */
export function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*[-–—|]\s*.+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildCanonicalKey(name: string, city: string): string {
  const n = normalizeRestaurantName(name).replace(/\s+/g, "");
  const c = city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
  return `${n}:${c || "unknown"}`;
}
