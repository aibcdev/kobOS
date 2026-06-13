"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IntegrationProvider } from "@prisma/client";

const LABELS: Record<string, string> = {
  GOOGLE_ANALYTICS: "Google Analytics",
  GOOGLE_SEARCH_CONSOLE: "Search Console",
  GOOGLE_CALENDAR: "Google Calendar",
  GMAIL: "Gmail (read-only)",
  SQUARE: "Square POS",
  INSTAGRAM: "Instagram",
  TOAST: "Toast POS",
  TIKTOK: "TikTok",
  SHOPIFY: "Shopify",
  OPENTABLE: "OpenTable",
  RESY: "Resy",
};

const HINTS: Record<string, string> = {
  GOOGLE_CALENDAR: "Your day shows up in the morning greeting",
  GMAIL: "Flags emails worth replying to",
  TOAST: "Paste your Toast API key to sync sales",
  OPENTABLE: "No public API yet — we'll request access for you",
  RESY: "No public API yet — we'll request access for you",
  INSTAGRAM: "Coming soon — Meta connection ships next",
};
/** Providers without self-serve OAuth: manual key entry is the primary path. */
const MANUAL_ONLY: IntegrationProvider[] = ["TOAST"];
/** Providers with no public API: store a request so tasks can reference them. */
const REQUEST_ONLY: IntegrationProvider[] = ["OPENTABLE", "RESY", "INSTAGRAM"];

export function ConnectIntegrationCard({
  restaurantId,
  provider,
  connected,
}: {
  restaurantId: string;
  provider: IntegrationProvider;
  connected: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [requested, setRequested] = useState(false);

  const manualOnly = MANUAL_ONLY.includes(provider);
  const requestOnly = REQUEST_ONLY.includes(provider);

  async function connectOAuth() {
    window.location.href = `/api/integrations/${provider}/connect?restaurantId=${encodeURIComponent(restaurantId)}`;
  }

  async function connectManual() {
    if (!token.trim()) return;
    setBusy(true);
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, provider, accessToken: token.trim() }),
    });
    setBusy(false);
    router.refresh();
  }

  async function requestAccess() {
    setBusy(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, provider, metadata: { requested: true, requestedAt: new Date().toISOString() } }),
      });
      setRequested(true);
    } finally {
      setBusy(false);
    }
  }

  const label = LABELS[provider] ?? provider.replace(/_/g, " ");
  const hint = HINTS[provider];

  return (
    <div className="relative flex items-center justify-between gap-2 rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        <p className="type-caption text-[var(--color-muted)]">
          {connected ? "Connected" : requested ? "Access requested" : hint ?? "Not connected"}
        </p>
      </div>
      {connected ? (
        <span className="type-caption text-green-700">✓</span>
      ) : requested ? (
        <span className="type-caption text-[var(--color-muted)]">Requested</span>
      ) : requestOnly ? (
        <button type="button" disabled={busy} onClick={() => void requestAccess()} className="type-caption shrink-0 text-[var(--color-primary)]">
          {busy ? "…" : "Request access"}
        </button>
      ) : manualOnly ? (
        <button type="button" onClick={() => setShowManual((v) => !v)} className="type-caption shrink-0 text-[var(--color-primary)]">
          Add key
        </button>
      ) : (
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => void connectOAuth()} className="type-caption text-[var(--color-primary)]">
            Connect
          </button>
          <button type="button" onClick={() => setShowManual((v) => !v)} className="type-caption text-[var(--color-muted)]">
            Key
          </button>
        </div>
      )}
      {showManual && !connected ? (
        <div className="absolute right-0 top-full z-10 mt-1 flex gap-1 rounded border border-[var(--color-hairline)] bg-white p-2 shadow-md">
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="button" disabled={busy} onClick={() => void connectManual()} className="text-xs text-[var(--color-primary)]">
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}
