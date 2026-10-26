"use client";

import { useState } from "react";

type Result = { added: number; duplicates: number; drafts: { actionId: string }[] };

/**
 * Add reviews by hand until KOB can read them from Google: one at a time (with optional stars, name and link) or
 * several pasted at once, which KOB splits. Each new review gets a drafted reply in Needs you.
 */
export function AddReviews({ restaurantId, restaurantQuery }: { restaurantId: string; restaurantQuery: string }) {
  const [mode, setMode] = useState<"one" | "many">("one");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewer, setReviewer] = useState("");
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const payload =
      mode === "many"
        ? { restaurantId, paste }
        : { restaurantId, reviews: [{ body, rating, reviewer: reviewer || null, url: url || null }] };
    const res = await fetch("/api/reviews/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't add that. Try again.");
    setResult(data);
    setBody("");
    setRating(0);
    setReviewer("");
    setUrl("");
    setPaste("");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-3xl border border-line bg-paper p-5 text-sm" data-testid="add-reviews">
      <div className="flex gap-2" role="tablist">
        {(["one", "many"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-full px-4 ${mode === m ? "bg-espresso text-paper" : "border border-line"}`}
          >
            {m === "one" ? "Add a review" : "Paste several"}
          </button>
        ))}
      </div>

      {mode === "one" ? (
        <>
          <label className="block">
            <span className="text-muted">The review</span>
            <textarea className="mt-1 min-h-24 w-full rounded-2xl border border-line bg-white p-3 text-base" value={body} onChange={(e) => setBody(e.target.value)} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-muted">Stars</span>
              <select className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                <option value={0}>Not sure</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted">Guest&apos;s name (optional)</span>
              <input className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-muted">Link to the review (optional)</span>
              <input type="url" className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </label>
          </div>
        </>
      ) : (
        <label className="block">
          <span className="text-muted">Copy reviews from Google and paste them here. Leave a blank line between reviews.</span>
          <textarea className="mt-1 min-h-40 w-full rounded-2xl border border-line bg-white p-3 text-base" value={paste} onChange={(e) => setPaste(e.target.value)} required />
        </label>
      )}

      <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-espresso px-5 text-paper disabled:opacity-50">
        {busy ? "Adding…" : "Add and draft replies"}
      </button>

      {result ? (
        <p role="status" className="text-sage">
          {result.added ? `Added ${result.added} review${result.added === 1 ? "" : "s"}. ` : ""}
          {result.duplicates ? `${result.duplicates} already here. ` : ""}
          {result.drafts.length ? (
            <a className="underline" href={`/app/needs-you${restaurantQuery}`}>
              {result.drafts.length} repl{result.drafts.length === 1 ? "y" : "ies"} ready to check
            </a>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
