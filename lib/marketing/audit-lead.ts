/** Normalize phone for storage (digits only, keep leading + if present). */
export function normalizeAuditPhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

export function isValidAuditPhone(raw: string): boolean {
  const digits = normalizeAuditPhone(raw).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function auditPhoneValidationMessage(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "Please enter your mobile number.";
  if (!isValidAuditPhone(t)) return "Enter a valid mobile number (at least 10 digits).";
  return null;
}
