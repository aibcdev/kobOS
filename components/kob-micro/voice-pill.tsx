"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Mic, X } from "lucide-react";
import { cn } from "@/lib/kob/utils";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const BARS = [0.35, 0.7, 0.45, 0.9, 0.55, 0.8, 0.4, 0.65];

export function VoicePill({
  className,
  onTranscript,
  onListeningChange,
  demoFallback = "What needs my attention today?",
}: {
  className?: string;
  onTranscript?: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  /** Used when Web Speech is unavailable or hold ends without speech. */
  demoFallback?: string;
}) {
  const reduce = useReducedMotion();
  const [listening, setListening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(BARS);
  const holdRef = useRef(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const gotFinal = useRef(false);
  const tickRef = useRef<number | null>(null);
  const waveRef = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stopListening = useCallback(
    (commit: boolean) => {
      holdRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (waveRef.current) window.clearInterval(waveRef.current);
      tickRef.current = null;
      waveRef.current = null;
      setListening(false);
      onListeningChange?.(false);
      if (commit && !gotFinal.current) {
        onTranscript?.(demoFallback);
      }
      gotFinal.current = false;
      setElapsed(0);
    },
    [demoFallback, onListeningChange, onTranscript],
  );

  const startListening = useCallback(() => {
    if (listening) return;
    holdRef.current = true;
    gotFinal.current = false;
    setListening(true);
    onListeningChange?.(true);
    startedAt.current = Date.now();
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 200);

    if (!reduce) {
      waveRef.current = window.setInterval(() => {
        setLevels((prev) => prev.map((v, i) => 0.25 + ((v + (i % 3) * 0.1 + Math.random() * 0.35) % 0.75)));
      }, 120);
    }

    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onresult = (ev) => {
      let final = "";
      for (let i = 0; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (row?.isFinal) final += row[0]?.transcript ?? "";
      }
      if (final.trim()) {
        gotFinal.current = true;
        onTranscript?.(final.trim());
        stopListening(false);
      }
    };
    rec.onerror = () => {
      /* fall through to demo on release */
    };
    rec.onend = () => {
      /* managed by stopListening */
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [listening, onListeningChange, onTranscript, reduce, stopListening]);

  useEffect(() => {
    return () => stopListening(false);
  }, [stopListening]);

  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-espresso text-paper shadow-soft select-none",
        listening ? "min-w-[9.5rem] px-3" : "w-11 justify-center px-0",
        className,
      )}
      aria-label={listening ? "Listening — release to send" : "Hold to talk to KOB"}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        startListening();
      }}
      onPointerUp={() => {
        if (!holdRef.current) return;
        stopListening(true);
      }}
      onPointerCancel={() => stopListening(false)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!listening) startListening();
          else stopListening(true);
        }
        if (e.key === "Escape" && listening) stopListening(false);
      }}
    >
      {listening ? (
        <>
          <Mic className="size-4 shrink-0" />
          <span className="text-xs font-medium tabular-nums">
            {mm}:{ss}
          </span>
          <span className="flex h-5 items-end gap-0.5 px-1" aria-hidden>
            {levels.map((h, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-paper/90"
                style={{ height: `${Math.max(20, h * 100)}%` }}
              />
            ))}
          </span>
          <X
            className="size-3.5 shrink-0 opacity-70"
            onClick={(e) => {
              e.stopPropagation();
              stopListening(false);
            }}
          />
        </>
      ) : (
        <Mic className="size-4" />
      )}
    </button>
  );
}
