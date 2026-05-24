"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { appBtnPrimary, appCardSurface, appInput } from "@/lib/app-ui-classes";

export function RestaurantOnboardingForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [website, setWebsite] = useState("");

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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; restaurant?: { id?: string } };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create restaurant.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const labelClass = "type-label-md block text-[var(--color-ink)]";

  return (
    <form className={`mt-8 space-y-4 ${appCardSurface}`} onSubmit={submit}>
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
      </label>
      {error ? <p className="type-body-sm text-[var(--color-error)]">{error}</p> : null}
      <button type="submit" disabled={busy} className={`${appBtnPrimary} w-full sm:w-auto`}>
        {busy ? "Creating…" : "Create restaurant"}
      </button>
    </form>
  );
}
