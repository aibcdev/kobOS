"use client";

import { useState } from "react";

import { appBtnPrimary, appBtnSecondary } from "@/lib/app-ui-classes";

type Props = { restaurantId: string };

export function RecommendationActions({ restaurantId }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runAiRecommendations() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
      if (!res.ok) {
        setMsg(data.error ?? "Failed to generate recommendations.");
      } else {
        setMsg(`Created ${data.created ?? 0} recommendation(s). Refresh to see them.`);
      }
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function generateContent(type: "SEO_BLOG" | "INSTAGRAM_CAPTION") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, type }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; outputPreview?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Content generation failed.");
      } else if (data.outputPreview) {
        setMsg(`Draft saved (${type.replaceAll("_", " ").toLowerCase()}). Preview: ${data.outputPreview}`);
      } else {
        setMsg("Draft saved.");
      }
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void runAiRecommendations()}
        className={appBtnPrimary}
      >
        Run AI recommendations
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void generateContent("SEO_BLOG")}
        className={appBtnSecondary}
      >
        Draft SEO blog
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void generateContent("INSTAGRAM_CAPTION")}
        className={appBtnSecondary}
      >
        Draft Instagram captions
      </button>
      {msg ? <p className="type-body-sm w-full text-[var(--color-muted)]">{msg}</p> : null}
    </div>
  );
}
