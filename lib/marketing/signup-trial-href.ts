/** Signup URL that carries the audit. After email auth they unlock core results. */
export function buildSignupTrialHref(input: {
  auditIdOrSlug: string;
  email?: string | null;
  restaurantName?: string | null;
}): string {
  const params = new URLSearchParams();
  const key = input.auditIdOrSlug.trim();
  if (key) {
    params.set("audit", key);
    params.set("next", `/audit/${key}`);
  }
  const email = input.email?.trim();
  if (email) params.set("email", email);
  const name = input.restaurantName?.trim();
  if (name) params.set("name", name);
  const qs = params.toString();
  return qs ? `/signup?${qs}` : "/signup";
}

/** Dashboard entry after they’ve signed up and want to shop services. */
export function buildDashboardFromAuditHref(input: {
  auditIdOrSlug: string;
  restaurantId?: string | null;
}): string {
  const params = new URLSearchParams();
  const key = input.auditIdOrSlug.trim();
  if (key) params.set("audit", key);
  if (input.restaurantId) params.set("r", input.restaurantId);
  params.set("welcome", "1");
  return `/dashboard?${params.toString()}`;
}
