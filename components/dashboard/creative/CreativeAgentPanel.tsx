"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type PackContent = {
  id: string;
  type: string;
  output: string;
  imageUrl: string | null;
  prompt: string;
  status: string;
  createdAt: string;
};

type PackDetail = {
  id: string;
  status: string;
  targetCount: number;
  doneCount: number;
  brief: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  contents: PackContent[];
};

type PackSummary = {
  id: string;
  status: string;
  targetCount: number;
  doneCount: number;
  brief: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
};

type Props = {
  restaurantId: string;
  restaurantName: string;
  initialPacks: PackSummary[];
  initialActivePack: PackDetail | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Queued";
    case "RUNNING":
      return "Generating…";
    case "COMPLETED":
      return "Ready";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function CreativeAgentPanel({
  restaurantId,
  restaurantName,
  initialPacks,
  initialActivePack,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dishHints, setDishHints] = useState("");
  const [packs, setPacks] = useState(initialPacks);
  const [active, setActive] = useState<PackDetail | null>(initialActivePack);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshPack = useCallback(
    async (packId: string) => {
      const res = await fetch(
        `/api/creative-agent/status?restaurantId=${encodeURIComponent(restaurantId)}&packId=${encodeURIComponent(packId)}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { pack: PackDetail };
      setActive(data.pack);
      return data.pack;
    },
    [restaurantId],
  );

  useEffect(() => {
    if (!active || (active.status !== "PENDING" && active.status !== "RUNNING")) return;
    const id = active.id;
    const t = setInterval(() => {
      void refreshPack(id).then((pack) => {
        if (pack && (pack.status === "COMPLETED" || pack.status === "FAILED")) {
          router.refresh();
        }
      });
    }, 4000);
    return () => clearInterval(t);
  }, [active, refreshPack, router]);

  async function startPack() {
    setBusy(true);
    setError(null);
    try {
      const hints = dishHints
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
      const res = await fetch("/api/creative-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          dishHints: hints.length ? hints : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        packId?: string;
        error?: string;
        message?: string;
        upgradeRequired?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? data.message ?? "Could not start Creative Agent.");
        return;
      }
      if (data.packId) {
        const pack = await refreshPack(data.packId);
        if (pack) {
          setPacks((prev) => [
            {
              id: pack.id,
              status: pack.status,
              targetCount: pack.targetCount,
              doneCount: pack.doneCount,
              brief: pack.brief,
              errorMessage: pack.errorMessage,
              createdAt: pack.createdAt,
            },
            ...prev.filter((p) => p.id !== pack.id),
          ]);
        }
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const brief = active?.brief as
    | {
        tagline?: string;
        voice?: string;
        visualStyle?: string;
        heroDishes?: string[];
        ugcHooks?: string[];
      }
    | undefined;

  const creatives =
    active?.contents.filter((c) => c.type === "CREATIVE_UGC" || c.type === "CREATIVE_DISH") ?? [];
  const inProgress = active?.status === "PENDING" || active?.status === "RUNNING";

  return (
    <div className="space-y-8">
      <section className={`${appCardSurface} border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40`}>
        <p className="type-caption font-medium uppercase tracking-wide text-emerald-800">Creative Agent</p>
        <h2 className="type-title-sm mt-2 text-[var(--color-ink)]">Create a month of creatives</h2>
        <p className="type-body-sm mt-2 max-w-2xl text-[var(--color-muted)]">
          We scrape {restaurantName}&apos;s brand signals, write an identity brief, then generate UGC-style
          ads and dish photography with captions — ready to post.
        </p>

        <label className="mt-5 block">
          <span className="type-caption text-[var(--color-muted-medium)]">
            Hero dishes (optional, comma-separated)
          </span>
          <input
            type="text"
            value={dishHints}
            onChange={(e) => setDishHints(e.target.value)}
            placeholder="e.g. truffle pasta, roast chicken, tiramisu"
            className="mt-1 w-full max-w-xl rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 type-body-sm outline-none focus:border-emerald-500"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || inProgress}
            className={`${appBtnPrimary} rounded-full bg-emerald-700 px-5 hover:bg-emerald-800`}
            onClick={() => void startPack()}
          >
            {busy || inProgress ? "Generating…" : "Create creatives"}
          </button>
          {active ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 type-caption font-medium text-emerald-900">
              {statusLabel(active.status)}
              {inProgress ? ` · ${active.doneCount}/${active.targetCount}` : ""}
            </span>
          ) : null}
        </div>
        {error ? <p className="type-body-sm mt-3 text-red-700">{error}</p> : null}
        {active?.errorMessage ? (
          <p className="type-body-sm mt-3 text-red-700">{active.errorMessage}</p>
        ) : null}
      </section>

      {brief && (brief.tagline || brief.voice) ? (
        <section className={appCardSurface}>
          <h3 className="type-title-sm">Brand identity brief</h3>
          {brief.tagline ? (
            <p className="type-body-md mt-3 font-medium text-[var(--color-ink)]">{brief.tagline}</p>
          ) : null}
          {brief.voice ? (
            <p className="type-body-sm mt-2 text-[var(--color-muted)]">
              <span className="font-medium text-[var(--color-ink)]">Voice:</span> {brief.voice}
            </p>
          ) : null}
          {brief.visualStyle ? (
            <p className="type-body-sm mt-1 text-[var(--color-muted)]">
              <span className="font-medium text-[var(--color-ink)]">Look:</span> {brief.visualStyle}
            </p>
          ) : null}
          {brief.heroDishes?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {brief.heroDishes.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-emerald-50 px-3 py-1 type-caption text-emerald-900"
                >
                  {d}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {creatives.length > 0 ? (
        <section>
          <h3 className="type-title-sm mb-4">Your creatives</h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creatives.map((c) => (
              <li key={c.id} className={`${appCardSurface} overflow-hidden p-0`}>
                {c.imageUrl ? (
                  <div className="relative aspect-square w-full bg-emerald-50">
                    <Image
                      src={c.imageUrl}
                      alt={c.type.replace(/_/g, " ")}
                      fill
                      className="object-cover"
                      unoptimized={c.imageUrl.startsWith("data:")}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-emerald-50 type-caption text-emerald-800">
                    Image pending
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <p className="type-caption font-medium uppercase tracking-wide text-emerald-800">
                    {c.type === "CREATIVE_UGC" ? "UGC ad" : "Dish photo"}
                  </p>
                  <p className="type-body-sm line-clamp-4 text-[var(--color-ink)]">{c.output}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={appBtnSecondary}
                      onClick={() => void copyCaption(c.id, c.output)}
                    >
                      {copiedId === c.id ? "Copied" : "Copy caption"}
                    </button>
                    {c.imageUrl && !c.imageUrl.startsWith("data:") ? (
                      <a
                        href={c.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={appBtnSecondary}
                      >
                        Open image
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {packs.length > 0 ? (
        <section className={appCardSurface}>
          <h3 className="type-title-sm">Past packs</h3>
          <ul className="mt-4 space-y-2">
            {packs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-body-sm text-[var(--color-muted)]">
                  {new Date(p.createdAt).toLocaleString()} · {statusLabel(p.status)} · {p.doneCount}/
                  {p.targetCount}
                </span>
                <button
                  type="button"
                  className={appBtnSecondary}
                  onClick={() => void refreshPack(p.id)}
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
