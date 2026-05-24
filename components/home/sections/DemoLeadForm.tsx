"use client";

import { useCallback, useState } from "react";

import { appBtnPrimary, appInput } from "@/lib/app-ui-classes";

const labelClass = "type-caption block text-[var(--color-muted-medium)]";

type FormState = "idle" | "submitting" | "success" | "error";

export function DemoLeadForm({ formTitle }: { formTitle: string }) {
  const [status, setStatus] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get("firstName") ?? "").trim(),
      lastName: String(fd.get("lastName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      restaurantName: String(fd.get("restaurantName") ?? "").trim(),
      addressLine1: String(fd.get("addressLine1") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      postalCode: String(fd.get("postalCode") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(typeof err?.error === "string" ? err.error : "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      e.currentTarget.reset();
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }, []);

  if (status === "success") {
    return (
      <div
        className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-warm)] p-[var(--spacing-lg)] text-[var(--color-ink)]"
        role="status"
      >
        <p className="type-title-sm">Thanks — we received your demo request.</p>
        <p className="type-body-md mt-2 text-[var(--color-muted)]">
          Our team will reach out shortly using the email you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-[var(--spacing-lg)] shadow-[var(--shadow-inset-hairline)]">
      <h3 className="type-title-sm text-[var(--color-ink)]">{formTitle}</h3>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="demo-firstName">
              First name
            </label>
            <input
              id="demo-firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              className={`${appInput} !mt-0`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="demo-lastName">
              Last name
            </label>
            <input
              id="demo-lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              className={`${appInput} !mt-0`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-email">
            Work email
          </label>
          <input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`${appInput} !mt-0`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-restaurantName">
            Restaurant name
          </label>
          <input
            id="demo-restaurantName"
            name="restaurantName"
            type="text"
            autoComplete="organization"
            required
            className={`${appInput} !mt-0`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-addressLine1">
            Street address <span className="text-[var(--color-muted-soft)]">(optional)</span>
          </label>
          <input
            id="demo-addressLine1"
            name="addressLine1"
            type="text"
            autoComplete="street-address"
            className={`${appInput} !mt-0`}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="demo-city">
              City <span className="text-[var(--color-muted-soft)]">(optional)</span>
            </label>
            <input id="demo-city" name="city" type="text" autoComplete="address-level2" className={`${appInput} !mt-0`} />
          </div>
          <div>
            <label className={labelClass} htmlFor="demo-postalCode">
              Postal code <span className="text-[var(--color-muted-soft)]">(optional)</span>
            </label>
            <input
              id="demo-postalCode"
              name="postalCode"
              type="text"
              autoComplete="postal-code"
              className={`${appInput} !mt-0`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-phone">
            Phone <span className="text-[var(--color-muted-soft)]">(optional)</span>
          </label>
          <input id="demo-phone" name="phone" type="tel" autoComplete="tel" className={`${appInput} !mt-0`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-message">
            Anything we should know? <span className="text-[var(--color-muted-soft)]">(optional)</span>
          </label>
          <textarea
            id="demo-message"
            name="message"
            rows={3}
            className={`${appInput} !mt-0 min-h-[96px] resize-y`}
          />
        </div>
        {status === "error" && message ? (
          <p className="type-body-sm text-[var(--color-error)]" role="alert">
            {message}
          </p>
        ) : null}
        <button type="submit" className={`${appBtnPrimary} w-full sm:w-auto`} disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Request demo"}
        </button>
      </form>
    </div>
  );
}
