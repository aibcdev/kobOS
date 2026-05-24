"use client";

import { useState } from "react";
import { auditPhoneValidationMessage } from "@/lib/marketing/audit-lead";
import { marketingCopy } from "@/lib/marketing/copy";
import { appInput } from "@/lib/app-ui-classes";
import { ownerBtnAccent } from "@/lib/marketing/owner-ui-classes";

export function AuditLeadFormFields({
  auditId,
  formId = "audit-lead-form",
  onSuccess,
  hideLegal,
}: {
  auditId: string;
  formId?: string;
  onSuccess?: () => void;
  hideLegal?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phoneErr = auditPhoneValidationMessage(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/${auditId}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save. Check your email and mobile number.");
        setLoading(false);
        return;
      }
      onSuccess?.();
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-[var(--color-ink)]">
          {marketingCopy.auditUnlock.emailLabel}
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={appInput}
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-[var(--color-ink)]">
          {marketingCopy.auditUnlock.phoneLabel}
        </label>
        <input
          id={`${formId}-phone`}
          name="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={appInput}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>
      {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}
      <button type="submit" disabled={loading} className={`${ownerBtnAccent} w-full rounded-[var(--radius-md)]`}>
        {loading ? marketingCopy.auditUnlock.submitting : marketingCopy.auditUnlock.submit}
      </button>
      {hideLegal ? null : (
        <p className="text-xs leading-relaxed text-[var(--color-muted-medium)]">{marketingCopy.auditUnlock.legal}</p>
      )}
    </form>
  );
}
