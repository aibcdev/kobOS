"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { RestaurantOnboardingForm } from "@/components/dashboard/RestaurantOnboardingForm";
import { SIGNUP_INTENT_KEY } from "@/components/marketing/saas/SaasSignupTrialForm";
import { looksLikeWebsiteInput, normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";
import { appInput, appLinkMuted } from "@/lib/app-ui-classes";
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

function cityFromAddress(address: string | undefined, secondary: string | undefined): string | undefined {
  const fromSecondary = secondary?.split(",")[0]?.trim();
  if (fromSecondary) return fromSecondary;
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}

/**
 * Empty Today / first-run: Places search → create venue → start snapshot → land on Today.
 */
export function RestaurantPlacesOnboarding({
  variant = "empty",
}: {
  variant?: "empty" | "compact";
}) {
  const router = useRouter();
  const [placesOn, setPlacesOn] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const auditIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SIGNUP_INTENT_KEY);
      if (raw) {
        const intent = JSON.parse(raw) as { restaurantName?: string; audit?: string | null };
        if (intent.restaurantName?.trim()) setQuery(intent.restaurantName.trim());
        if (intent.audit?.trim()) {
          setAuditId(intent.audit.trim());
          auditIdRef.current = intent.audit.trim();
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("audit")?.trim();
      if (fromUrl) {
        setAuditId(fromUrl);
        auditIdRef.current = fromUrl;
      }
    } catch {
      /* ignore */
    }
  }, []);

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
    if (!placesOn || looksLikeWebsiteInput(query) || busy) {
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
        setOpen(true);
        setHighlight(0);
      } catch {
        setSuggestions([]);
      }
    }, 280);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [query, placesOn, busy]);

  const createFromPlace = useCallback(
    async (s: Suggestion, d: PlaceDetails | null) => {
      setBusy(true);
      setError(null);
      const name = (d?.name ?? s.mainText).trim();
      const city = cityFromAddress(d?.formattedAddress, s.secondaryText);
      const website =
        normalizeAuditWebsiteUrl(d?.websiteUri?.trim() ?? "") ??
        (looksLikeWebsiteInput(query) ? normalizeAuditWebsiteUrl(query) : null);

      try {
        let startedAuditId = auditIdRef.current;

        if (!startedAuditId && website) {
          const startRes = await fetch("/api/audit/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              websiteUrl: website,
              siteScope: "one",
              place: d
                ? {
                    placeId: d.placeId,
                    name: d.name,
                    formattedAddress: d.formattedAddress,
                    lat: d.lat,
                    lng: d.lng,
                  }
                : {
                    placeId: s.placeId,
                    name: s.mainText,
                    formattedAddress: s.secondaryText,
                  },
            }),
          });
          const startData = (await startRes.json().catch(() => ({}))) as { id?: string };
          if (startRes.ok && startData.id) {
            startedAuditId = startData.id;
          }
        }

        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            city: city || undefined,
            website: website || undefined,
            auditId: startedAuditId || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: unknown;
          restaurant?: { id?: string };
        };
        if (!res.ok || !data.restaurant?.id) {
          setError(typeof data.error === "string" ? data.error : "Could not create restaurant.");
          setBusy(false);
          return;
        }

        try {
          sessionStorage.removeItem(SIGNUP_INTENT_KEY);
        } catch {
          /* ignore */
        }

        router.push(`/dashboard?r=${encodeURIComponent(data.restaurant.id)}&welcome=1`);
        router.refresh();
      } catch {
        setError("Network error — check your connection and try again.");
        setBusy(false);
      }
    },
    [query, router],
  );

  const selectSuggestion = useCallback(
    async (s: Suggestion) => {
      setQuery(s.mainText);
      setOpen(false);
      setSuggestions([]);
      setError(null);
      setBusy(true);
      try {
        const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`, {
          cache: "no-store",
        });
        const d = res.ok ? ((await res.json()) as PlaceDetails) : null;
        await createFromPlace(s, d);
      } catch {
        setError("Could not load that restaurant. Try again or add manually.");
        setBusy(false);
      }
    },
    [createFromPlace],
  );

  if (manual || placesOn === false) {
    return (
      <div className={variant === "empty" ? "mx-auto max-w-xl px-[var(--spacing-md)] py-16" : ""}>
        {variant === "empty" ? (
          <>
            <h1 className="type-title-md text-balance">Where are you losing customers online?</h1>
            <p className="type-body-md mt-3 text-pretty text-[var(--color-muted)]">
              {marketingCopy.dashboardOnboarding.promise}
            </p>
          </>
        ) : null}
        <RestaurantOnboardingForm />
        {placesOn !== false ? (
          <button
            type="button"
            className={`${appLinkMuted} mt-4`}
            onClick={() => {
              setManual(false);
              setError(null);
            }}
          >
            Search on Google instead
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={variant === "empty" ? "mx-auto max-w-xl px-[var(--spacing-md)] py-16 sm:py-24" : ""}>
      <h1 className="font-head text-3xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] text-balance sm:text-4xl">
        Where are you losing customers online?
      </h1>
      <p className="type-body-md mt-3 max-w-md text-pretty text-[var(--color-muted)]">
        We&apos;ll map the guest journey and show the three fixes that matter most.
      </p>

      <div className="relative mt-8">
        <label className="sr-only" htmlFor="restaurant-places-search">
          Find your restaurant on Google
        </label>
        <input
          id="restaurant-places-search"
          value={query}
          disabled={busy}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const s = suggestions[highlight];
              if (s) void selectSuggestion(s);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Find your restaurant on Google"
          className={`${appInput} h-14 text-base`}
          autoComplete="off"
          autoFocus={variant === "empty"}
        />

        {open && placesOn && !busy && (suggestions.length > 0 || query.trim().length >= 3) ? (
          <ul
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-auto rounded-2xl border border-[var(--color-hairline)] bg-white py-2 shadow-[var(--shadow-card-elevated)]"
            role="listbox"
          >
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[var(--color-muted-medium)]">Searching…</li>
            ) : (
              suggestions.map((s, i) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
                      i === highlight ? "bg-[var(--color-surface-cream)]" : "hover:bg-[var(--color-surface-warm)]"
                    }`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => void selectSuggestion(s)}
                  >
                    <span className="font-head text-base font-semibold text-[var(--color-ink)]">{s.mainText}</span>
                    {s.secondaryText ? (
                      <span className="text-sm text-[var(--color-muted-medium)]">{s.secondaryText}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {busy ? (
        <p className="type-body-sm mt-4 text-[var(--color-muted)]">
          Adding your restaurant and starting your journey snapshot…
        </p>
      ) : null}
      {error ? <p className="type-body-sm mt-4 text-[var(--color-error)]">{error}</p> : null}

      <p className="type-caption mt-6 text-[var(--color-muted-medium)]">
        {marketingCopy.dashboardOnboarding.promise}
      </p>

      <button
        type="button"
        className={`${appLinkMuted} mt-4`}
        onClick={() => {
          setManual(true);
          setError(null);
        }}
      >
        Add manually
      </button>

      {auditId && !busy ? (
        <p className="mt-6 rounded-xl bg-[var(--color-primary)]/8 px-3 py-2 text-sm text-[var(--color-ink)]">
          Your growth report will link to this venue automatically.
        </p>
      ) : null}
    </div>
  );
}
