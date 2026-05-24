"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditFormAlert } from "@/components/marketing/audit/AuditFormAlert";
import {
  auditInlineValidationMessage,
  parseAuditStartApiError,
  type AuditUserMessage,
} from "@/lib/audit/audit-start-errors";
import { marketingCopy } from "@/lib/marketing/copy";
import { looksLikeWebsiteInput, normalizeAuditWebsiteUrl } from "@/lib/audit/normalize-website-url";

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  websiteUri: string | null;
  lat: number | null;
  lng: number | null;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]";

function AuditCapsule({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[32px] border border-[var(--color-hairline)]/80 bg-white p-1.5 shadow-[0_20px_50px_-16px_rgba(9,68,19,0.18)] sm:flex-row sm:items-stretch ${className}`}
    >
      {children}
    </div>
  );
}

function SearchField({
  children,
  showDropdown,
  suggestions,
  suggestLoading,
  highlight,
  onSelect,
  onHighlight,
}: {
  children: React.ReactNode;
  showDropdown: boolean;
  suggestions: Suggestion[];
  suggestLoading: boolean;
  highlight: number;
  onSelect: (s: Suggestion) => void;
  onHighlight: (i: number) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      {showDropdown ? (
        <ul
          className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 max-h-72 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white py-2 shadow-[var(--shadow-card-elevated)]"
          role="listbox"
        >
          {suggestLoading && suggestions.length === 0 ? (
            <li className="px-5 py-3 text-sm text-[var(--color-muted-medium)]">Searching restaurants…</li>
          ) : null}
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`flex w-full flex-col items-start gap-0.5 px-5 py-3.5 text-left transition-colors ${
                  i === highlight ? "bg-[var(--color-surface-cream)]" : "hover:bg-[var(--color-surface-warm)]"
                }`}
                onMouseEnter={() => onHighlight(i)}
                onClick={() => void onSelect(s)}
              >
                <span className="font-head text-base font-semibold text-[var(--color-ink)]">{s.mainText}</span>
                {s.secondaryText ? (
                  <span className="text-sm text-[var(--color-muted-medium)]">{s.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}

export function AuditBusinessSearch({ variant = "full" }: { variant?: "full" | "hero" }) {
  const isHero = variant === "hero";
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const [placesOn, setPlacesOn] = useState<boolean | null>(null);
  const [mapsOn, setMapsOn] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/places/status", { cache: "no-store" });
        const j = (await res.json()) as { placesConfigured?: boolean; mapsConfigured?: boolean };
        setPlacesOn(Boolean(j.placesConfigured));
        setMapsOn(Boolean(j.mapsConfigured));
      } catch {
        setPlacesOn(false);
      }
    })();
  }, []);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [websiteOverride, setWebsiteOverride] = useState("");
  const [urlPasteMode, setUrlPasteMode] = useState(false);
  const [siteScope, setSiteScope] = useState<"one" | "multiple">("one");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");
  const [sampleImageUrl1, setSampleImageUrl1] = useState("");
  const [sampleImageUrl2, setSampleImageUrl2] = useState("");
  const [sampleImageUrl3, setSampleImageUrl3] = useState("");
  const [alert, setAlert] = useState<AuditUserMessage | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const runSuggest = useCallback(async (q: string) => {
    if (q.trim().length < 3 || looksLikeWebsiteInput(q)) {
      setSuggestions([]);
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const data = (await res.json()) as { suggestions?: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const manualMode = placesOn === false;
  const urlEntryMode = manualMode || urlPasteMode;

  const queryLooksLikeUrl = useMemo(() => looksLikeWebsiteInput(query), [query]);
  const overrideLooksLikeUrl = useMemo(() => looksLikeWebsiteInput(websiteOverride), [websiteOverride]);
  const typedLooksLikeUrl = queryLooksLikeUrl || overrideLooksLikeUrl;

  useEffect(() => {
    if (!placesOn || urlEntryMode || looksLikeWebsiteInput(query)) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSuggest(query);
    }, 280);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [query, placesOn, urlEntryMode, runSuggest]);

  const effectiveWebsite = useMemo(() => {
    const fromPlace = details?.websiteUri?.trim();
    const o = websiteOverride.trim();
    if (fromPlace) return fromPlace;
    return o;
  }, [details?.websiteUri, websiteOverride]);

  const selectSuggestion = useCallback(async (s: Suggestion) => {
    setSelected(s);
    setQuery(`${s.mainText}${s.secondaryText ? ` — ${s.secondaryText}` : ""}`);
    setOpen(false);
    setAlert(null);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`, { cache: "no-store" });
      if (!res.ok) {
        setDetails(null);
        setAlert(auditInlineValidationMessage("Could not load this place. Try another or paste your website URL."));
        return;
      }
      const d = (await res.json()) as PlaceDetails;
      setDetails(d);
      if (d.websiteUri?.trim()) setWebsiteOverride("");
    } catch {
      setDetails(null);
      setAlert(auditInlineValidationMessage("Could not load place details. Try again or paste your website URL."));
    }
  }, []);

  const resolveSubmitWebsite = useCallback((): { url: string; usePlaceGeo: boolean } | { error: string } => {
    const overrideUrl = websiteOverride.trim() ? normalizeAuditWebsiteUrl(websiteOverride) : null;

    if (urlEntryMode) {
      const raw = websiteOverride.trim() || query.trim();
      const url = overrideUrl ?? normalizeAuditWebsiteUrl(raw);
      if (!url) {
        return { error: "Enter a valid website address (e.g. turtlebay.co.uk)." };
      }
      return { url, usePlaceGeo: false };
    }

    const directFromQuery = queryLooksLikeUrl ? normalizeAuditWebsiteUrl(query) : null;
    const directUrl = overrideUrl ?? directFromQuery;
    if (directUrl) {
      return { url: directUrl, usePlaceGeo: false };
    }

    if (!selected) {
      return { error: "Pick a restaurant from the list, or paste your website URL below." };
    }
    if (!details) {
      return { error: "Still loading this place — try again in a second." };
    }

    const placeUrl =
      normalizeAuditWebsiteUrl(details.websiteUri?.trim() ?? "") ??
      normalizeAuditWebsiteUrl(effectiveWebsite);
    if (!placeUrl) {
      return { error: "Google did not return a website for this listing. Paste your site URL below." };
    }
    return { url: placeUrl, usePlaceGeo: true };
  }, [urlEntryMode, websiteOverride, query, queryLooksLikeUrl, selected, details, effectiveWebsite]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hydrated) return;

      setAlert(null);

      const resolved = resolveSubmitWebsite();
      if ("error" in resolved) {
        setAlert(auditInlineValidationMessage(resolved.error));
        return;
      }

      const { url: submitUrl, usePlaceGeo } = resolved;

      setLoading(true);
      try {
        const userSocial =
          instagram.trim() || facebook.trim() || tiktok.trim() || googleBusinessUrl.trim()
            ? {
                instagram: instagram.trim() || undefined,
                facebook: facebook.trim() || undefined,
                tiktok: tiktok.trim() || undefined,
                googleBusinessUrl: googleBusinessUrl.trim() || undefined,
              }
            : undefined;
        const sampleUrls = [sampleImageUrl1, sampleImageUrl2, sampleImageUrl3].map((s) => s.trim()).filter(Boolean);

        const placePayload =
          usePlaceGeo && details
            ? {
                placeId: details.placeId,
                name: details.name,
                formattedAddress: details.formattedAddress,
                lat: details.lat,
                lng: details.lng,
              }
            : undefined;

        const res = await fetch("/api/audit/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteUrl: submitUrl,
            siteScope,
            userSocial,
            ...(placePayload ? { place: placePayload } : {}),
            ...(sampleUrls.length ? { userImageUrls: sampleUrls.slice(0, 3) } : {}),
          }),
        });

        const rawText = await res.text();
        let data: { id?: string; error?: string; hint?: string; code?: string; details?: unknown };
        try {
          data = rawText ? (JSON.parse(rawText) as typeof data) : {};
        } catch {
          setAlert(
            auditInlineValidationMessage("We got an unexpected response. Please try again."),
          );
          return;
        }

        if (!res.ok) {
          setAlert(parseAuditStartApiError(res.status, data));
          return;
        }

        if (data.id) {
          const lat = usePlaceGeo ? (details?.lat ?? null) : null;
          const lng = usePlaceGeo ? (details?.lng ?? null) : null;
          const placeLabel = usePlaceGeo
            ? `${details?.name ?? selected?.mainText ?? ""}`.trim() || selected?.mainText || null
            : null;
          try {
            sessionStorage.setItem(
              `kob-audit-scan-${data.id}`,
              JSON.stringify({ lat, lng, placeLabel, mapsConfigured: mapsOn }),
            );
          } catch {
            /* ignore */
          }
          router.push(`/audit/${data.id}/scanning`);
          return;
        }
        setAlert(auditInlineValidationMessage("Something went wrong starting your report. Please try again."));
      } catch {
        setAlert(
          parseAuditStartApiError(0, {
            error: "Network error",
            hint: process.env.NODE_ENV === "development" ? "Check your connection and dev server." : undefined,
          }),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      hydrated,
      resolveSubmitWebsite,
      siteScope,
      instagram,
      facebook,
      tiktok,
      googleBusinessUrl,
      sampleImageUrl1,
      sampleImageUrl2,
      sampleImageUrl3,
      router,
      mapsOn,
      details,
      selected,
    ],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (urlEntryMode) return;
    if (e.key === "Enter" && queryLooksLikeUrl) return;
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = suggestions[highlight];
      if (s) void selectSuggestion(s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown =
    !urlEntryMode && !queryLooksLikeUrl && open && (suggestions.length > 0 || suggestLoading);
  const submitDisabled = loading || !hydrated;

  const inputValue = urlEntryMode ? websiteOverride || query : query;
  const onInputChange = (v: string) => {
    setAlert(null);
    if (urlEntryMode) {
      setWebsiteOverride(v);
      if (!manualMode) setQuery(v);
    } else {
      setQuery(v);
      setSelected(null);
      setDetails(null);
      if (looksLikeWebsiteInput(v)) {
        setOpen(false);
        setSuggestions([]);
      } else {
        setOpen(true);
        setHighlight(0);
      }
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} className="relative mx-auto w-full">
      {placesOn === false ? (
        <p className="mb-6 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)] px-5 py-3.5 text-left text-sm leading-relaxed text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]">Tip:</span> Paste your website URL below—we&apos;ll
          still run your full AI report.
        </p>
      ) : null}

      <AuditCapsule>
        <SearchField
          showDropdown={showDropdown}
          suggestions={suggestions}
          suggestLoading={suggestLoading}
          highlight={highlight}
          onSelect={selectSuggestion}
          onHighlight={setHighlight}
        >
          <input
            type="text"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => {
              if (!urlEntryMode && !queryLooksLikeUrl) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder={
              urlEntryMode ? "yourrestaurant.com or https://…" : marketingCopy.input.restaurantPlaceholder
            }
            className="h-14 min-w-0 flex-1 border-0 bg-transparent px-5 text-base text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted-medium)] md:h-[3.75rem] md:px-6 md:text-lg"
          />
          {!urlEntryMode && suggestLoading && !queryLooksLikeUrl ? (
            <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-xs font-medium text-[var(--color-muted-medium)] sm:inline">
              Searching…
            </span>
          ) : null}
        </SearchField>

        <button
          type="submit"
          disabled={submitDisabled}
          className="type-button inline-flex h-14 min-h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-primary)] shadow-[0_4px_20px_-4px_rgba(8,137,36,0.45)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-active)] disabled:opacity-60 sm:h-[3.75rem] sm:min-h-[3.75rem] sm:w-auto sm:min-w-[3.75rem] sm:rounded-full sm:px-8"
          aria-label={marketingCopy.cta.aiReport}
        >
          {loading ? (
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          ) : (
            <>
              <span className="hidden sm:inline">{marketingCopy.cta.aiReport}</span>
              <span className="text-xl leading-none" aria-hidden>
                ↑
              </span>
            </>
          )}
        </button>
      </AuditCapsule>

      {alert ? (
        <AuditFormAlert
          alert={alert}
          onRetry={() => {
            setAlert(null);
          }}
        />
      ) : null}

      {!isHero && !manualMode && !urlPasteMode ? (
        <p className="mt-4 text-center">
          <button
            type="button"
            className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            onClick={() => {
              setUrlPasteMode(true);
              setQuery("");
              setSelected(null);
              setDetails(null);
              setOpen(false);
            }}
          >
            Or paste your website URL instead
          </button>
        </p>
      ) : null}

      {!isHero && !manualMode && urlPasteMode ? (
        <p className="mt-4 text-center">
          <button
            type="button"
            className="text-sm font-medium text-[var(--color-muted-medium)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            onClick={() => {
              setUrlPasteMode(false);
              setWebsiteOverride("");
            }}
          >
            ← Search by restaurant name
          </button>
        </p>
      ) : null}

      {!urlEntryMode && details && !details.websiteUri?.trim() && !queryLooksLikeUrl ? (
        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-5 py-4 text-left">
          <label className="block text-sm font-medium text-[var(--color-ink)]">Website URL (required for scan)</label>
          <input
            type="text"
            value={websiteOverride}
            onChange={(e) => setWebsiteOverride(e.target.value)}
            className={`${fieldClass} mt-2`}
            placeholder="yourrestaurant.com"
          />
        </div>
      ) : null}

      {isHero && !manualMode && !urlPasteMode ? (
        <p className="mt-3 text-center">
          <button
            type="button"
            className="type-caption text-[var(--color-muted-medium)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            onClick={() => {
              setUrlPasteMode(true);
              setQuery("");
              setSelected(null);
              setDetails(null);
              setOpen(false);
            }}
          >
            Paste website URL instead
          </button>
        </p>
      ) : null}

      {!isHero ? (
      <details className="group mt-8 text-left">
        <summary className="cursor-pointer list-none text-center text-sm font-medium text-[var(--color-muted-medium)] transition-colors hover:text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            Optional settings
            <span className="text-xs transition-transform group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </span>
        </summary>
        <div className="mt-4 space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)]/70 px-5 py-5">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-medium)]">
              Sites you operate
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
                <input
                  type="radio"
                  name="siteScope"
                  checked={siteScope === "one"}
                  onChange={() => setSiteScope("one")}
                  className="accent-[var(--color-primary)]"
                />
                One main site
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
                <input
                  type="radio"
                  name="siteScope"
                  checked={siteScope === "multiple"}
                  onChange={() => setSiteScope("multiple")}
                  className="accent-[var(--color-primary)]"
                />
                Multi-location roll-up
              </label>
            </div>
          </fieldset>
          <p className="text-xs text-[var(--color-muted-medium)]">Social &amp; sample images (optional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={fieldClass} placeholder="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            <input className={fieldClass} placeholder="Facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
            <input className={fieldClass} placeholder="TikTok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            <input className={fieldClass} placeholder="Google Business Profile URL" value={googleBusinessUrl} onChange={(e) => setGoogleBusinessUrl(e.target.value)} />
            <input className={`${fieldClass} sm:col-span-2`} placeholder="Sample image URL 1" value={sampleImageUrl1} onChange={(e) => setSampleImageUrl1(e.target.value)} />
            <input className={fieldClass} placeholder="Sample image URL 2" value={sampleImageUrl2} onChange={(e) => setSampleImageUrl2(e.target.value)} />
            <input className={fieldClass} placeholder="Sample image URL 3" value={sampleImageUrl3} onChange={(e) => setSampleImageUrl3(e.target.value)} />
          </div>
        </div>
      </details>
      ) : null}

      {!urlEntryMode && typedLooksLikeUrl ? (
        <p className="mt-4 text-center text-sm font-medium text-[var(--color-primary)]">
          We&apos;ll scan this website directly — no need to pick from the list.
        </p>
      ) : null}

      <p className={`text-center type-caption text-[var(--color-muted-medium)] ${isHero ? "mt-4" : "mt-6"}`}>
        Takes about a minute · No credit card required
      </p>
    </form>
  );
}
