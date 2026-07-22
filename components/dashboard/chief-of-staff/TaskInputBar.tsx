"use client";

import { useCallback, useRef, useState } from "react";
import { cosCard } from "@/lib/dashboard/chief-of-staff-theme";
import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function TaskInputBar({
  restaurantId,
  previewMode,
  onTaskCreated,
  onPending,
  onError,
}: {
  restaurantId: string;
  previewMode?: boolean;
  onTaskCreated: (task: ChiefOfStaffTaskDto) => void;
  onPending?: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (previewMode) {
      onError("Preview mode — tasks save after sign-in.");
      return;
    }
    setBusy(true);
    onPending?.(trimmed);
    try {
      const res = await fetch("/api/chief-of-staff/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, text: trimmed }),
      });
      const body = (await res.json()) as { task?: ChiefOfStaffTaskDto; error?: string };
      if (res.ok && body.task) {
        setText("");
        onTaskCreated(body.task);
      } else {
        onError(body.error ?? "Could not create the task.");
      }
    } catch {
      onError("Could not create the task.");
    } finally {
      setBusy(false);
    }
  }, [busy, onError, onPending, onTaskCreated, previewMode, restaurantId, text]);

  const toggleMic = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) {
      onError("Voice input is not supported in this browser.");
      return;
    }
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [listening, onError]);

  return (
    <div className={`${cosCard} flex items-center gap-2 p-3`}>
      <input
        className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#999]"
        placeholder="What would you like to get done?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        disabled={busy}
        aria-label="Give KOB a task"
      />
      <button
        type="button"
        onClick={toggleMic}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          listening ? "bg-red-500 text-white" : "bg-[#f0f0f0] text-[#555] hover:bg-[#e5e5e5]"
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !text.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition-opacity disabled:opacity-40"
        aria-label="Create task"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.27 3.97a.6.6 0 01.78-.76l16.2 8.25a.6.6 0 010 1.08L4.05 20.79a.6.6 0 01-.78-.76L6 12zm0 0h7.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
