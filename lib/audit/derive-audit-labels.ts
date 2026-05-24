export function guessNameFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const parts = t.split(/\s*[|\u2013\-–]\s*/);
  const head = parts[0]?.trim();
  return head ? head.slice(0, 80) : null;
}

export function hostLabelFromUrl(raw: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return "Your website";
  }
}

export function auditCityLabel(siteScope: "one" | "multiple"): string {
  return siteScope === "multiple" ? "Multi-location" : "Your area";
}
