"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ContentType } from "@prisma/client";
import { useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type GenerateResult = {
  outputPreview?: string;
  imageUrl?: string | null;
  error?: string;
};

type ResultState = { label: string; preview: string; imageUrl: string | null } | null;

export function ContentGeneratePanel({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>(null);

  async function generate(type: ContentType, label: string, withImage = false) {
    setBusyLabel(label);
    setError(null);
    setResult({ label, preview: "Writing your draft…", imageUrl: null });
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          type,
          prompt: `Create ${label} for this restaurant based on today's priorities.`,
          withImage,
        }),
      });
      const body = (await res.json()) as GenerateResult;
      if (res.ok && body.outputPreview) {
        setResult({
          label,
          preview: body.outputPreview,
          imageUrl: body.imageUrl ?? null,
        });
        router.refresh();
      } else {
        setResult(null);
        setError(
          body.error ??
            "Could not generate. Make sure GEMINI_API_KEY is set in your environment.",
        );
      }
    } catch {
      setResult(null);
      setError("Network error — please try again.");
    }
    setBusyLabel(null);
  }

  const busy = busyLabel !== null;

  return (
    <div className={`mt-8 ${appCardSurface}`}>
      <h2 className="type-title-sm">Generate content</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Copy is ready in seconds. Add an image only when you need one — images take longer.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={`${appBtnPrimary} transition-transform active:scale-[0.98]`}
          onClick={() => void generate(ContentType.INSTAGRAM_CAPTION, "Instagram post", false)}
        >
          {busyLabel === "Instagram post" ? "Writing…" : "Social post"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${appBtnSecondary} transition-transform active:scale-[0.98]`}
          onClick={() => void generate(ContentType.INSTAGRAM_CAPTION, "Instagram post with image", true)}
        >
          {busyLabel === "Instagram post with image" ? "Creating…" : "Social + image"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${appBtnPrimary} transition-transform active:scale-[0.98]`}
          onClick={() => void generate(ContentType.EMAIL_CAMPAIGN, "email campaign", false)}
        >
          {busyLabel === "email campaign" ? "Writing…" : "Email campaign"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${appBtnPrimary} transition-transform active:scale-[0.98]`}
          onClick={() => void generate(ContentType.GOOGLE_BUSINESS_POST, "Google Business post", false)}
        >
          {busyLabel === "Google Business post" ? "Writing…" : "Google post"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <p className="type-caption font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            {result.label} {busy ? "— working…" : "— draft ready"}
          </p>
          {result.imageUrl ? (
            <div className="mt-3 overflow-hidden rounded-[var(--radius-default)]">
              <Image
                src={result.imageUrl}
                alt={result.label}
                width={512}
                height={512}
                className="w-full max-w-sm object-cover"
                unoptimized
              />
            </div>
          ) : null}
          <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-body)] ${busy ? "animate-pulse text-[var(--color-muted)]" : ""}`}>
            {result.preview}
          </p>
          {!busy ? (
            <p className="mt-3 text-xs text-[var(--color-muted)]">Saved to your list below.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
