"use client";

import { ContentType } from "@prisma/client";
import { useState } from "react";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";

export function ContentGeneratePanel({ restaurantId }: { restaurantId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generate(type: ContentType, label: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, type, prompt: `Create ${label} for this restaurant based on today's task list priorities.` }),
      });
      const body = (await res.json()) as { error?: string; outputPreview?: string };
      if (res.ok) {
        setMsg("Draft created — refresh to see it in the list.");
        window.location.reload();
      } else {
        setMsg(body.error ?? "Could not generate.");
      }
    } catch {
      setMsg("Network error.");
    }
    setBusy(false);
  }

  return (
    <div className={`mt-8 ${appCardSurface}`}>
      <h2 className="type-title-sm">Generate content</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">Create drafts from your workspace — or approve tasks on Today.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={appBtnPrimary} onClick={() => void generate(ContentType.INSTAGRAM_CAPTION, "Instagram posts")}>
          Social post
        </button>
        <button type="button" disabled={busy} className={appBtnPrimary} onClick={() => void generate(ContentType.EMAIL_CAMPAIGN, "email campaign")}>
          Email campaign
        </button>
        <button type="button" disabled={busy} className={appBtnPrimary} onClick={() => void generate(ContentType.GOOGLE_BUSINESS_POST, "Google post")}>
          Google post
        </button>
      </div>
      {msg ? <p className="type-body-sm mt-3 text-[var(--color-muted)]">{msg}</p> : null}
    </div>
  );
}
