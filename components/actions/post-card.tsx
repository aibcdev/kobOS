"use client";

import { useState } from "react";
import { StatusMark } from "@/components/kob-micro";
import type { ActionView } from "@/lib/agent/access";
import { actionsApi } from "@/lib/agent/action-client";

/** Clipboard API where allowed; a hidden textarea where it isn't (older Safari, http previews). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

const SKIP_REASONS = ["Wrong tone", "Wrong facts", "Not now", "Don't do this"] as const;

/**
 * Assisted mode (Google posting not switched on yet): the owner approves the exact words, KOB copies them and opens
 * Google, the owner pastes and posts, then taps "I've posted it". Same approval as auto mode; nothing is sent to
 * Google by KOB. States: drafted → approved (copied) → posted by you.
 */
export function PostCard({
  action,
  detailHref,
  onSettled,
}: {
  action: ActionView;
  detailHref?: string;
  onSettled?: (view: ActionView) => void;
}) {
  const assist = action.assist!;
  const [view, setView] = useState(action);
  const [text, setText] = useState(assist.copyText);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const waiting = view.status === "AWAITING_APPROVAL" || view.status === "PROPOSED";
  const approved = view.status === "APPROVED";
  const posted = view.status === "DONE_BY_OWNER";
  const words = view.assist?.copyText ?? text;
  const needsCheck = waiting && view.requiresSlide;

  function settle(next: ActionView) {
    setView(next);
    if (next.assist) setText(next.assist.copyText);
    onSettled?.(next);
  }

  async function copy(value: string, toast: string) {
    const ok = await copyText(value);
    actionsApi.assistEvent(view.id, "copied");
    setNote(ok ? toast : "Couldn't copy it. Select the text above and copy it.");
  }

  function openGoogle() {
    window.open(assist.googleUrl, "_blank", "noopener,noreferrer");
    actionsApi.assistEvent(view.id, "opened_google");
  }

  /** Save edits, then approve. Copy and open happen first, inside the tap, so the browser allows them. */
  async function approve(alsoOpen: boolean) {
    setError(null);
    void copy(text, "Copied. Paste it into Google and press Post.");
    if (alsoOpen) openGoogle();
    setBusy(true);
    if (assist.editableField && text.trim() !== assist.copyText.trim()) {
      const edited = await actionsApi.edit(view.id, text);
      if (!edited.ok) {
        setBusy(false);
        setError(edited.error ?? "Couldn't save your edit.");
        return;
      }
    }
    const res = await actionsApi.approve(view.id, { scope: "ONCE", ...(view.requiresSlide ? { confirm: "slide" as const } : {}) });
    setBusy(false);
    if (res.action) settle(res.action);
    if (!res.ok) setError(res.error ?? "Couldn't approve that. It's still copied — try approving again.");
  }

  async function markPosted() {
    setBusy(true);
    setError(null);
    const res = await actionsApi.posted(view.id);
    setBusy(false);
    if (res.action) settle(res.action);
    if (!res.ok) setError(res.error ?? "Couldn't save that.");
    else setNote(null);
  }

  async function skip(reason: string) {
    setBusy(true);
    const res = await actionsApi.reject(view.id, reason);
    setBusy(false);
    if (res.action) settle(res.action);
    if (!res.ok) setError(res.error ?? "Couldn't skip that.");
  }

  return (
    <article className="space-y-3 rounded-3xl border border-line bg-paper p-5" data-testid="post-card" data-status={view.status}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{view.title}</h3>
        {detailHref ? (
          <a href={detailHref} className="shrink-0 text-sm text-muted underline">
            Details
          </a>
        ) : null}
      </div>

      {assist.context ? <p className="whitespace-pre-wrap rounded-2xl bg-bone p-3 text-sm text-muted">{assist.context}</p> : null}

      {waiting && assist.editableField ? (
        <label className="block text-sm">
          <span className="text-muted">{assist.kind === "review_reply" ? "Your reply" : "What goes on Google"} (you can edit it)</span>
          <textarea
            className="mt-1 min-h-28 w-full rounded-2xl border border-line bg-white p-3 text-base"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1500}
          />
        </label>
      ) : (
        <p className="whitespace-pre-wrap rounded-2xl border border-line bg-white p-3 text-base" data-testid="post-text">
          {words}
        </p>
      )}

      {posted ? (
        <p className="flex items-center gap-2 text-sm" data-testid="action-status-text">
          <StatusMark state="verified" /> Posted by you
        </p>
      ) : view.status === "REJECTED" ? (
        <p className="text-sm text-muted">Skipped.</p>
      ) : null}

      {waiting ? (
        <div className="space-y-2">
          {needsCheck ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I&apos;ve read it and it&apos;s right
            </label>
          ) : null}
          <button
            type="button"
            disabled={busy || (needsCheck && !checked) || !text.trim()}
            onClick={() => void approve(true)}
            className="min-h-11 w-full rounded-full bg-espresso px-5 text-paper disabled:opacity-50"
          >
            {busy ? "Saving…" : "Approve, copy & open Google"}
          </button>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" disabled={busy || (needsCheck && !checked)} onClick={() => void approve(false)} className="min-h-11 rounded-full border border-line px-4">
              Approve and copy
            </button>
            <button type="button" onClick={openGoogle} className="min-h-11 rounded-full border border-line px-4">
              {assist.googleLabel}
            </button>
            <button type="button" disabled={busy} onClick={() => setSkipping((s) => !s)} className="min-h-11 rounded-full px-4 text-muted underline">
              Skip
            </button>
          </div>
          {skipping ? (
            <div className="flex flex-wrap gap-2 text-sm">
              {SKIP_REASONS.map((r) => (
                <button key={r} type="button" onClick={() => void skip(r)} className="min-h-11 rounded-full border border-line px-3">
                  {r}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {approved ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Approved. Paste it into Google, press Post, then tell KOB.</p>
          <button type="button" disabled={busy} onClick={() => void markPosted()} className="min-h-11 w-full rounded-full bg-espresso px-5 text-paper disabled:opacity-50">
            {busy ? "Saving…" : assist.doneLabel}
          </button>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => void copy(words, "Copied again.")} className="min-h-11 rounded-full border border-line px-4">
              Copy again
            </button>
            <button type="button" onClick={openGoogle} className="min-h-11 rounded-full border border-line px-4">
              {assist.googleLabel}
            </button>
          </div>
        </div>
      ) : null}

      {note ? (
        <p role="status" className="text-sm text-sage">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </article>
  );
}
