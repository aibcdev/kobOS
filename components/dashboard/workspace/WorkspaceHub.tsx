"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConnectIntegrationCard } from "@/components/dashboard/integrations/ConnectIntegrationCard";
import { appBtnSecondary, appCardSurface, appInput } from "@/lib/app-ui-classes";

type SearchHit = {
  type: string;
  id: string;
  label: string;
  snippet: string;
  href: string;
};

type RecentItem = { id: string; label: string; href: string; kind: string };

export function WorkspaceHub({
  restaurantId,
  recentItems,
  pins,
  useSampleData,
  connectedProviders,
}: {
  restaurantId: string;
  recentItems: RecentItem[];
  pins: { id: string; title: string; href: string }[];
  useSampleData: boolean;
  connectedProviders: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sampleOn, setSampleOn] = useState(useSampleData);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) return;
      const res = await fetch(
        `/api/workspace/search?restaurantId=${encodeURIComponent(restaurantId)}&q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { results: SearchHit[] };
      setResults(data.results);
      setSearched(true);
    },
    [restaurantId],
  );

  const search = useCallback(() => runSearch(query), [query, runSearch]);

  // Auto-run if navigated from the global search bar
  useEffect(() => {
    if (initialQ.trim().length >= 2) {
      void runSearch(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("restaurantId", restaurantId);
    fd.set("file", file);
    await fetch("/api/workspace/files", { method: "POST", body: fd });
    setUploading(false);
    router.refresh();
  }

  async function toggleSample() {
    await fetch("/api/integrations/sample-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, enabled: !sampleOn }),
    });
    setSampleOn(!sampleOn);
  }

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Workspace</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Capture files, search your data, run agents, and launch apps.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Capture */}
        <section className={appCardSurface}>
          <h2 className="type-title-sm">Capture</h2>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">Add files and connect your tools.</p>
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input type="file" className="hidden" onChange={(e) => void onUpload(e)} disabled={uploading} />
            <span className={appBtnSecondary}>{uploading ? "Uploading…" : "Upload file"}</span>
          </label>
          <div className="mt-4 space-y-2">
            <ConnectIntegrationCard restaurantId={restaurantId} provider="GOOGLE_ANALYTICS" connected={connectedProviders.includes("GOOGLE_ANALYTICS")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="GOOGLE_SEARCH_CONSOLE" connected={connectedProviders.includes("GOOGLE_SEARCH_CONSOLE")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="GOOGLE_CALENDAR" connected={connectedProviders.includes("GOOGLE_CALENDAR")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="GMAIL" connected={connectedProviders.includes("GMAIL")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="SQUARE" connected={connectedProviders.includes("SQUARE")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="TOAST" connected={connectedProviders.includes("TOAST")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="OPENTABLE" connected={connectedProviders.includes("OPENTABLE")} />
            <ConnectIntegrationCard restaurantId={restaurantId} provider="RESY" connected={connectedProviders.includes("RESY")} />
          </div>
          <button type="button" onClick={() => void toggleSample()} className="type-caption mt-4 text-[var(--color-muted)] underline">
            Sample data: {sampleOn ? "On" : "Off"}
          </button>
        </section>

        {/* Search */}
        <section className={appCardSurface}>
          <h2 className="type-title-sm">Search</h2>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">Ask your workspace a question.</p>
          <div className="mt-4 flex gap-2">
            <input
              className={appInput}
              placeholder="Search reviews, content, tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
            <button type="button" className={appBtnSecondary} onClick={() => void search()}>
              Search
            </button>
          </div>
          {searched && results.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No results for &ldquo;{query}&rdquo; — try a different term.</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link href={r.href} className="type-body-sm text-[var(--color-ink)] underline-offset-2 hover:underline">
                    {r.label}
                  </Link>
                  <p className="type-caption text-[var(--color-muted)]">{r.snippet}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {recentItems.length > 0 ? (
            <div className="mt-6">
              <p className="type-caption font-medium text-[var(--color-ink)]">Recent in workspace</p>
              <ul className="mt-2 space-y-1">
                {recentItems.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="type-caption text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                      {item.label} · {item.kind}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Run agents */}
        <section className={appCardSurface}>
          <h2 className="type-title-sm">Run agents</h2>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">Delegate tasks to your assistant.</p>
          <Link
            href={`/dashboard/chat?r=${encodeURIComponent(restaurantId)}`}
            className={`mt-4 inline-flex ${appBtnSecondary}`}
          >
            Open Chat
          </Link>
        </section>

        {/* Generate apps */}
        <section className={appCardSurface}>
          <h2 className="type-title-sm">Generate apps</h2>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">Shortcuts built from chat.</p>
          {pins.length === 0 ? (
            <p className="type-caption mt-4 text-[var(--color-muted)]">Ask Chat to pin an app — e.g. &quot;Build a review monitor&quot;</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {pins.map((p) => (
                <li key={p.id}>
                  <Link href={`${p.href}?r=${encodeURIComponent(restaurantId)}`} className="type-body-sm font-medium text-[var(--color-ink)]">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/dashboard/apps?r=${encodeURIComponent(restaurantId)}`} className="type-caption mt-4 inline-block text-[var(--color-primary)]">
            View all apps →
          </Link>
        </section>
      </div>
    </div>
  );
}
