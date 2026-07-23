"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { looksLikeWebsiteInput, normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";
import { marketingCopy } from "@/lib/marketing/copy";

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  websiteUri: string | null;
  lat: number | null;
  lng: number | null;
};

const GOALS = [
  { value: "", label: "Select one…" },
  { value: "visibility", label: "More guests from Google & search" },
  { value: "website", label: "Fix our website & mobile ordering" },
  { value: "photos", label: "Better food photos online" },
  { value: "reviews", label: "Reviews & reputation" },
  { value: "all", label: "All of the above" },
] as const;

const inputClass =
  "mt-2 w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-3.5 text-base text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function DemoOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [placesOn, setPlacesOn] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [goal, setGoal] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/places/status", { cache: "no-store" });
        const j = (await res.json()) as { placesConfigured?: boolean };
        setPlacesOn(Boolean(j.placesConfigured));
      } catch {
        setPlacesOn(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!placesOn || looksLikeWebsiteInput(query)) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 280);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [query, placesOn]);

  const selectSuggestion = useCallback(async (s: Suggestion) => {
    setSelected(s);
    setQuery(`${s.mainText}${s.secondaryText ? ` — ${s.secondaryText}` : ""}`);
    setOpen(false);
    setError(null);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`, { cache: "no-store" });
      if (res.ok) setDetails((await res.json()) as PlaceDetails);
    } catch {
      setDetails(null);
    }
  }, []);

  const restaurantName = details?.name ?? selected?.mainText ?? query.trim();

  const onStep1Continue = () => {
    setError(null);
    if (!restaurantName) {
      setError("Search and select your restaurant, or type its name.");
      return;
    }
    if (!goal) {
      setError("Choose what you want to improve first.");
      return;
    }
    setStep(2);
  };

  const onStep2Submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setError("Add your name and work email.");
        return;
      }
      setLoading(true);
      try {
        const goalLabel = GOALS.find((g) => g.value === goal)?.label ?? goal;
        await fetch("/api/demo-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            restaurantName,
            city: details?.formattedAddress?.split(",").pop()?.trim(),
            phone: phone.trim() || undefined,
            message: `Demo signup goal: ${goalLabel}`,
          }),
        });

        const websiteUrl =
          normalizeAuditWebsiteUrl(details?.websiteUri?.trim() ?? "") ??
          (looksLikeWebsiteInput(query) ? normalizeAuditWebsiteUrl(query) : null);

        if (websiteUrl) {
          const startRes = await fetch("/api/audit/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              websiteUrl,
              siteScope: "one",
              place: details
                ? {
                    placeId: details.placeId,
                    name: details.name,
                    formattedAddress: details.formattedAddress,
                    lat: details.lat,
                    lng: details.lng,
                  }
                : undefined,
            }),
          });
          const startData = (await startRes.json()) as { id?: string };
          if (startRes.ok && startData.id) {
            if (details?.lat != null && details?.lng != null) {
              try {
                sessionStorage.setItem(
                  `kob-audit-scan-${startData.id}`,
                  JSON.stringify({ lat: details.lat, lng: details.lng, placeLabel: restaurantName }),
                );
              } catch {
                /* ignore */
              }
            }
            router.push(`/audit/${startData.id}/scanning`);
            return;
          }
        }

        router.push("/audit");
      } catch {
        setError("Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [details, email, firstName, goal, lastName, phone, query, restaurantName, router],
  );

  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--color-hairline)] bg-white p-8 shadow-[0_24px_48px_-12px_rgba(9,68,19,0.12)] md:p-10">
      <p className="text-center text-sm text-[var(--color-muted-medium)]">Step {step} of 2</p>
      <h2 className="mt-3 text-center font-head text-xl font-semibold leading-snug text-[var(--color-ink)] md:text-2xl">
        {step === 1 ? marketingCopy.demo.step1Headline : "Almost there — where should we send your scan?"}
      </h2>
      {step === 2 ? (
        <p className="mt-2 text-center text-sm text-[var(--color-muted-medium)]">{marketingCopy.demo.step2Subline}</p>
      ) : null}

      {step === 1 ? (
        <div className="mt-8 space-y-5">
          <div className="relative">
            <label className="sr-only" htmlFor="demo-restaurant">
              Restaurant name
            </label>
            <input
              id="demo-restaurant"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setDetails(null);
                setOpen(true);
                setHighlight(0);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search your restaurant name…"
              className={inputClass}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-[var(--color-muted-medium)]">{marketingCopy.demo.step1Hint}</p>
            {open && suggestions.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border border-[var(--color-hairline)] bg-white py-1 shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left text-sm ${i === highlight ? "bg-[var(--color-surface-cream)]" : "hover:bg-[var(--color-surface-warm)]"}`}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => void selectSuggestion(s)}
                    >
                      <span className="font-medium">{s.mainText}</span>
                      {s.secondaryText ? (
                        <span className="block text-xs text-[var(--color-muted-medium)]">{s.secondaryText}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <label className="sr-only" htmlFor="demo-goal">
              Primary goal
            </label>
            <select
              id="demo-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={inputClass}
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value} disabled={!g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onStep1Continue}
            className="w-full rounded-full bg-[var(--color-primary)] py-4 text-base font-semibold text-white hover:bg-[var(--color-accent)]"
          >
            Continue
          </button>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onStep2Submit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="demo-fn">
                First name
              </label>
              <input id="demo-fn" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="demo-ln">
                Last name
              </label>
              <input id="demo-ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="demo-email">
              Work email
            </label>
            <input
              id="demo-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="demo-phone">
              Phone <span className="font-normal text-[var(--color-muted-medium)]">(optional)</span>
            </label>
            <input id="demo-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--color-primary)] py-4 text-base font-semibold text-white hover:bg-[var(--color-accent)] disabled:opacity-60"
          >
            {loading ? "Starting…" : "Run my free AI scan"}
          </button>
          <button type="button" className="w-full text-sm text-[var(--color-muted-medium)] hover:text-[var(--color-ink)]" onClick={() => setStep(1)}>
            ← Back
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-center text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-muted-medium)]">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        . Prefer self-serve?{" "}
        <Link href="/audit" className="font-medium text-[var(--color-primary)] underline">
          Run a free scan
        </Link>
        .
      </p>
    </div>
  );
}
