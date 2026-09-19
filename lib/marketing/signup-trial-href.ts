/** Signup / hire URLs that bridge audit → onboard Talk. */

export function buildSignupTrialHref(input: {
  auditIdOrSlug: string;
  email?: string | null;
  restaurantName?: string | null;
}): string {
  const params = new URLSearchParams();
  const key = input.auditIdOrSlug.trim();
  const name = input.restaurantName?.trim();
  const onboardParams = new URLSearchParams();
  onboardParams.set("from", "audit");
  if (key) onboardParams.set("audit", key);
  if (name) onboardParams.set("name", name);
  const onboardPath = `/onboard?${onboardParams.toString()}`;

  if (key) {
    params.set("audit", key);
    params.set("next", onboardPath);
  }
  const email = input.email?.trim();
  if (email) params.set("email", email);
  if (name) params.set("name", name);
  const qs = params.toString();
  return qs ? `/signup?${qs}` : `/signup?next=${encodeURIComponent("/onboard")}`;
}

/** After audit unlock — hire path lands in onboard / Talk, not ops dashboard. */
export function buildDashboardFromAuditHref(input: {
  auditIdOrSlug: string;
  restaurantId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("from", "audit");
  const key = input.auditIdOrSlug.trim();
  if (key) params.set("audit", key);
  if (input.restaurantId) params.set("r", input.restaurantId);
  return `/onboard?${params.toString()}`;
}

/** Direct hire CTA with restaurant prefilled (no signup gate). */
export function buildOnboardFromAuditHref(input: {
  auditIdOrSlug: string;
  restaurantName?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("from", "audit");
  const key = input.auditIdOrSlug.trim();
  if (key) params.set("audit", key);
  const name = input.restaurantName?.trim();
  if (name) params.set("name", name);
  return `/onboard?${params.toString()}`;
}
