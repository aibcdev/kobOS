"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { CORE_BENEFITS } from "@/lib/kob/demo";
import { speakAsKob } from "@/lib/kob/tts";
import { cn } from "@/lib/kob/utils";

const OPENING = "What can I take from here?";

type Line = { id: string; role: "kob" | "you"; text: string };

function speak(text: string) {
  speakAsKob(text);
}

function replyTo(text: string) {
  const t = text.toLowerCase();
  if (/hour|closed|open/.test(t)) {
    return "KOB will prepare the hours on Google and the site. Nothing goes live until you say Apply hours.";
  }
  if (/review/.test(t)) {
    return "Five-stars go out in your tone. Complaints stay with you. KOB will not offer a voucher unless you ask.";
  }
  if (/waste|invoice|kitchen|delivery|prep|salmon|cheese/.test(t)) {
    return "Send the delivery photo. KOB reads the lines, checks the house rate, and drafts the supplier note. You approve before it leaves.";
  }
  if (/price|cost|£|trial/.test(t)) {
    return "Founding is £99 a location. Fourteen-day trial. You start it yourself — no demo call.";
  }
  if (/dashboard|tool|platform/.test(t)) {
    return "KOB is not a dashboard. KOB is the manager who uses your tools. You talk. KOB takes the job.";
  }
  return "You talk on the floor. KOB takes Google, reviews, hours, the website, and the kitchen. Sign in when you want KOB on the job.";
}

export function TalkOrb({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      return;
    }
    setLines([{ id: "open", role: "kob", text: OPENING }]);
    speak(OPENING);
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [open]);

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const you: Line = { id: `you-${Date.now()}`, role: "you", text };
    setLines((prev) => [...prev, you]);
    const answer = replyTo(text);
    window.setTimeout(() => {
      setLines((prev) => [
        ...prev,
        { id: `kob-${Date.now()}`, role: "kob", text: answer },
      ]);
      speak(answer);
    }, 450);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mx-auto flex flex-col items-center bg-transparent p-0 text-center"
        aria-label="Talk to KOB"
      >
        <GreenOrb size="hero" working={open} />
        <span className="mt-5 inline-flex h-11 items-center rounded-full bg-paper/90 px-5 text-sm font-medium text-espresso backdrop-blur-sm group-hover:bg-paper">
          Talk to KOB
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-espresso/40 p-4 sm:items-center sm:p-6"
          role="dialog"
          aria-label="Talk to KOB"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close talk"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] bg-paper shadow-soft sm:max-w-2xl">
            <div className="flex shrink-0 items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <GreenOrb size="sm" working />
                <p className="text-sm font-medium">KOB</p>
              </div>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full hover:bg-cream"
                aria-label="End talk"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="shrink-0 border-b border-line px-5 pb-4">
              <p className="text-xs font-medium text-muted">What I take</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {CORE_BENEFITS.map((item) => (
                  <li key={item.title} className="rounded-2xl bg-cream px-3.5 py-3">
                    <p className="text-sm font-medium text-espresso">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "flex gap-2",
                    line.role === "you" ? "justify-end" : "justify-start",
                  )}
                >
                  {line.role === "kob" ? <KobMark size="sm" /> : null}
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      line.role === "kob"
                        ? "bg-cream text-ink"
                        : "bg-espresso text-paper",
                    )}
                  >
                    {line.text}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={send} className="flex shrink-0 gap-2 px-5 py-4">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Give KOB the job…"
                aria-label="Message KOB"
              />
              <Button type="submit" disabled={!draft.trim()}>
                Send
              </Button>
            </form>

            <div className="flex shrink-0 gap-2 border-t border-line px-5 py-4">
              <Button size="sm" className="flex-1" asChild>
                <Link href="/signup">Try for free</Link>
              </Button>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
