"use client";

import { useState } from "react";

export function CreateWorkspace() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-10">
      <h1 className="font-display text-3xl">What is your restaurant called?</h1>
      <p className="mt-3 text-muted">
        One workspace for your conversation and connected accounts.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const values = new FormData(event.currentTarget);
          try {
            const response = await fetch("/api/restaurants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: String(values.get("name") ?? "").trim(),
                city: String(values.get("city") ?? "").trim() || undefined,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            });
            const data = (await response.json()) as {
              restaurant?: { id: string };
            };
            if (!response.ok || !data.restaurant)
              throw new Error("Couldn't create your workspace. Please retry.");
            window.location.assign(
              `/app?r=${encodeURIComponent(data.restaurant.id)}`,
            );
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Couldn't create your workspace.",
            );
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          Restaurant name
          <input
            name="name"
            required
            maxLength={200}
            className="mt-2 block w-full rounded-xl border border-line bg-paper p-3 text-base"
          />
        </label>
        <label className="block text-sm">
          City (optional)
          <input
            name="city"
            maxLength={120}
            className="mt-2 block w-full rounded-xl border border-line bg-paper p-3 text-base"
          />
        </label>
        <p className="text-xs text-muted">
          Calendar dates use your browser&apos;s timezone when creating this
          workspace.
        </p>
        {error ? (
          <p role="alert" className="text-sm">
            {error}
          </p>
        ) : null}
        <button
          disabled={busy}
          type="submit"
          className="min-h-11 rounded-full bg-espresso px-5 py-3 text-paper disabled:opacity-50"
        >
          {busy ? "Creating…" : "Open Talk"}
        </button>
      </form>
    </main>
  );
}
