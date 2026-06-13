"use client";

import { useCallback, useEffect, useState } from "react";
import { NpsGaugeCard } from "@/components/dashboard/insights/NpsGaugeCard";
import { NpsTrendCard } from "@/components/dashboard/insights/NpsTrendCard";
import { SentimentDriversCard } from "@/components/dashboard/insights/SentimentDriversCard";
import { appCardSurface } from "@/lib/app-ui-classes";
import type { ThemeDriver, NpsBreakdown, WeeklyNps } from "@/lib/insights/customer-voice";

type ReviewRow = {
  id: string;
  body: string;
  rating: number;
  reviewerName: string | null;
  themes: { theme: string; sentiment: string }[];
};

export function CustomerInsightsPanel({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const [nps, setNps] = useState<NpsBreakdown | null>(null);
  const [drivers, setDrivers] = useState<ThemeDriver[]>([]);
  const [weekly, setWeekly] = useState<WeeklyNps[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classifying, setClassifying] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/insights/customer-voice?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      nps: NpsBreakdown;
      drivers: ThemeDriver[];
      weekly: WeeklyNps[];
      alertMessage: string | null;
      reviews: ReviewRow[];
    };
    setNps(data.nps);
    setDrivers(data.drivers);
    setWeekly(data.weekly);
    setAlertMessage(data.alertMessage);
    setReviews(data.reviews);
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function classify() {
    setClassifying(true);
    await fetch("/api/insights/classify-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId }),
    });
    setClassifying(false);
    await load();
  }

  const filtered = reviews.filter((r) => {
    if (filterTheme && !r.themes.some((t) => t.theme === filterTheme)) return false;
    if (search && !r.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!nps) return <p className="type-body-sm text-[var(--color-muted)]">Loading insights…</p>;

  return (
    <div>
      {alertMessage ? (
        <div className="mb-6 flex items-center justify-between rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span>⚡ {alertMessage}</span>
        </div>
      ) : null}

      <p className="type-body-sm text-[var(--color-muted)]">
        {restaurantName} · {nps.total} reviews · Review score programme
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2 text-sm"
          placeholder="Search comments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void classify()}
          disabled={classifying}
          className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2 text-sm"
        >
          {classifying ? "Analysing…" : "Analyse themes"}
        </button>
      </div>
      <p className="type-caption mt-2 text-[var(--color-muted)]">{filtered.length} of {reviews.length} shown</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <NpsGaugeCard nps={nps} />
        <SentimentDriversCard drivers={drivers} onFilter={setFilterTheme} activeTheme={filterTheme} />
        <NpsTrendCard weekly={weekly} />
        <div className={`${appCardSurface} lg:col-span-2`}>
          <h2 className="type-title-sm">Comments</h2>
          <ul className="mt-4 space-y-3">
            {filtered.map((r) => (
              <li key={r.id} className="border-b border-[var(--color-hairline)] pb-3 text-sm">
                <p className="font-medium text-[var(--color-ink)]">
                  {r.reviewerName ?? "Guest"} · {r.rating}★
                </p>
                <p className="mt-1 text-[var(--color-muted)]">{r.body || "(no text)"}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
