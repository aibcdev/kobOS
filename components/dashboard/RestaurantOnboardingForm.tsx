"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SIGNUP_INTENT_KEY } from "@/components/marketing/saas/SaasSignupTrialForm";
import { appBtnPrimary, appCardSurface, appInput } from "@/lib/app-ui-classes";
import { marketingCopy } from "@/lib/marketing/copy";

type SignupIntent = {
  restaurantName?: string;
  audit?: string | null;
};

export function RestaurantOnboardingForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [website, setWebsite] = useState("");
  const [auditId, setAuditId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SIGNUP_INTENT_KEY);
      if (!raw) return;
      const intent = JSON.parse(raw) as SignupIntent;
      if (intent.restaurantName?.trim()) setName(intent.restaurantName.trim());
      if (intent.audit?.trim()) setAuditId(intent.audit.trim());
    } catch {
      /* ignore */
    }
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("audit")?.trim();
      if (fromUrl) setAuditId(fromUrl);
    } catch {
      /* ignore */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || undefined,
          state: stateRegion.trim() || undefined,
          cuisineType: cuisineType.trim() || undefined,
          website: website.trim() || undefined,
          auditId: auditId || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        restaurant?: { id?: string };
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create restaurant.");
        return;
      }
      try {
        sessionStorage.removeItem(SIGNUP_INTENT_KEY);
      } catch {
        /* ignore */
      }
      // FREE browse first — card paywall only when they Request a service.
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const labelClass = "type-label-md block text-[var(--color-ink)]";

  return (
    <form className={`mt-8 space-y-4 ${appCardSurface}`} onSubmit={submit}>
      {auditId ? (
        <p className="type-body-sm rounded-xl bg-[var(--color-primary)]/8 px-3 py-2 text-[var(--color-ink)]">
          Your growth report will be linked — you&apos;ll see the same three fixes on your dashboard.
        </p>
      ) : null}
      <label className={labelClass}>
        Restaurant name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Studio West Supper Club"
          className={appInput}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} className={appInput} />
        </label>
        <label className={labelClass}>
          State / region
          <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className={appInput} />
        </label>
      </div>
      <label className={labelClass}>
        Cuisine type
        <input
          value={cuisineType}
          onChange={(e) => setCuisineType(e.target.value)}
          placeholder="Modern Italian"
          className={appInput}
        />
      </label>
      <label className={labelClass}>
        Website URL (optional)
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
          className={appInput}
        />
        <span className="type-caption mt-1 block text-[var(--color-muted-medium)]">
          {marketingCopy.dashboardOnboarding.websiteHint}
        </span>
      </label>
      {error ? <p className="type-body-sm text-[var(--color-error)]">{error}</p> : null}
      <button type="submit" disabled={busy} className={`${appBtnPrimary} w-full sm:w-auto`}>
        {busy ? "Creating…" : "Create restaurant"}
      </button>
      <p className="type-caption text-[var(--color-muted-medium)]">
        Free to explore. When you request website, SEO, or other work, you&apos;ll start a 7-day trial (card
        required).
      </p>
    </form>
  );
}
