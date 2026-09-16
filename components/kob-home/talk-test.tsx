"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AudioLines, X } from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { speakAsKob } from "@/lib/kob/tts";
import { cn } from "@/lib/kob/utils";

const OPENING =
  "This is a 20-second test. The real manager works after you connect free tools — Google listing, website, weather, invoice photos. What do you want to try?";

type Line = { id: string; role: "kob" | "you"; text: string };

function replyTo(text: string) {
  const t = text.toLowerCase();
  if (/hour|closed|open|google|review/.test(t)) {
    return "In the product, that job runs on your Google listing — not this bubble. Sign in, connect Google in Kitchen, then talk.";
  }
  if (/waste|invoice|kitchen|margin|till/.test(t)) {
    return "Invoice photos are free. Enable them in Kitchen, then send a delivery note. This button is only a test.";
  }
  if (/weather|rain|forecast/.test(t)) {
    return "Weather is free. Turn it on in Kitchen with your city. This bubble is only a test.";
  }
  if (/price|cost|£|trial/.test(t)) {
    return "Founding is £99 a location. Start a 14-day trial, then connect free tools.";
  }
  return "Nice. Start a trial, turn on free tools in Kitchen, then Talk is the manager — not this test.";
}

export function TalkTest({ className }: { className?: string }) {
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
    speakAsKob(OPENING);
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [open]);

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setLines((prev) => [...prev, { id: `you-${Date.now()}`, role: "you", text }]);
    const answer = replyTo(text);
    window.setTimeout(() => {
      setLines((prev) => [
        ...prev,
        { id: `kob-${Date.now()}`, role: "kob", text: answer },
      ]);
      speakAsKob(answer);
    }, 450);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mx-auto flex flex-col items-center rounded-2xl bg-espresso/35 p-7 text-center shadow-soft backdrop-blur-md"
        aria-label="Talk test"
      >
        <span className="inline-flex size-20 items-center justify-center rounded-2xl bg-paper text-espresso sm:size-24">
          <AudioLines className="size-10" strokeWidth={1.6} />
        </span>
        <span className="mt-5 inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-medium text-espresso group-hover:bg-cream">
          Talk · 20s test
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-espresso/40 p-4 sm:items-center"
          role="dialog"
          aria-label="Talk test"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close talk"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] bg-paper shadow-soft">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <KobMark size="sm" working />
                <p className="text-sm font-medium">Talk test</p>
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

            <p className="px-4 pb-2 text-xs text-muted">
              Not the product. Connect your tools after sign-up.
            </p>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto px-4 pb-2">
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

            <form onSubmit={send} className="flex gap-2 px-4 py-4">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Try a question…"
                aria-label="Message KOB test"
              />
              <Button type="submit" disabled={!draft.trim()}>
                Send
              </Button>
            </form>

            <div className="flex gap-2 border-t border-line px-4 py-3">
              <Button size="sm" className="flex-1" asChild>
                <Link href="/onboard">Start free trial</Link>
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
