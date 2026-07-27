/**
 * Operator (KOB internal) access for the service-request ticket queue.
 * Set OPS_OPERATOR_EMAILS=you@trykob.com,ops@trykob.com
 */
export function isOperatorEmail(email: string | null | undefined): boolean {
  const raw = process.env.OPS_OPERATOR_EMAILS?.trim();
  if (!raw || !email?.trim()) return false;
  const allow = new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return allow.has(email.trim().toLowerCase());
}
