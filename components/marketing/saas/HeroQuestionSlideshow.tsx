"use client";

import { useEffect, useState } from "react";

import { marketingCopy } from "@/lib/marketing/copy";

const INTERVAL_MS = 2800;

/** Single-row rotating question pills shown next to the free-scan input. */
export function HeroQuestionSlideshow() {
  const prompts = marketingCopy.graderPrompts;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % prompts.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [prompts.length]);

  const current = prompts[index]!;

  return (
    <div className="relative mt-4 h-11 w-full max-w-md overflow-hidden" aria-live="polite">
      {prompts.map((prompt, i) => {
        const active = i === index;
        return (
          <div
            key={prompt.label}
            className={`absolute inset-x-0 top-0 flex justify-start transition-all duration-500 ease-out ${
              active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
            }`}
            aria-hidden={!active}
          >
            <span
              className={`inline-flex max-w-full items-center rounded-full border border-[#2c2c2c]/8 px-5 py-2.5 text-sm font-medium text-[#1a1a1a] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.28)] ${
                i % 2 === 1 ? "bg-[#f3eee6]" : "bg-white"
              }`}
            >
              <span className="truncate">{prompt.label}</span>
            </span>
          </div>
        );
      })}
      <span className="sr-only">{current.label}</span>
    </div>
  );
}
