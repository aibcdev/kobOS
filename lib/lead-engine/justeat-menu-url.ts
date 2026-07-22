/** Build Just Eat menu path when the API omits URL (e.g. /restaurants-name-city/menu). */
export function buildJustEatMenuPath(name: string, city: string): string {
  const slug = [name, city]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/restaurants-${slug}/menu`;
}

export function resolveJustEatMenuPath(
  name: string,
  city: string,
  existing: string | null | undefined,
): string {
  const trimmed = existing?.trim();
  if (trimmed) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return buildJustEatMenuPath(name, city);
}
