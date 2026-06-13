/** UK-first Places configuration for the public audit funnel. */

export function auditPlacesRegionCodes(): string[] {
  const raw = process.env.PLACES_AUTOCOMPLETE_REGIONS?.trim();
  if (raw) {
    const parts = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]{2}$/.test(s));
    if (parts.length) return parts;
  }
  return ["GB", "IE"];
}

export const UK_MAP_CENTER = { lat: 51.5074, lng: -0.1278 } as const;
