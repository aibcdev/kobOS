"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { LangosteriaWordmark } from "@/components/kob-brand/langosteria-mark";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { cn } from "@/lib/kob/utils";

export type DemoStep = {
  from: "guest" | "kob" | "done" | "call";
  who?: string;
  text: string;
  chip?: string;
  chipColor?: string;
};

export function AlvenRoleStage({
  steps,
  videoSrc,
  accent = "#e23c1a",
  className,
}: {
  steps: DemoStep[];
  videoSrc?: string;
  accent?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"video" | "live">(
    videoSrc ? "video" : "live",
  );
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setMode(videoSrc ? "video" : "live");
    setVisible(0);
  }, [videoSrc, steps]);

  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    let timers: number[] = [];

    function playOnce() {
      timers.forEach(clearTimeout);
      timers = [];
      if (cancelled) return;
      setVisible(0);
      steps.forEach((_, i) => {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) setVisible(i + 1);
          }, 350 + i * 850),
        );
      });
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) playOnce();
        }, 350 + steps.length * 850 + 1800),
      );
    }

    playOnce();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [mode, steps]);

  useEffect(() => {
    if (mode !== "video" || !videoRef.current) return;
    const v = videoRef.current;
    v.load();
    const play = v.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => setMode("live"));
    }
  }, [mode, videoSrc]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3 px-1">
        <LangosteriaWordmark size="sm" withExample />
        <span className="text-[0.65rem] text-muted">Jobs demo</span>
      </div>

      {mode === "video" && videoSrc ? (
        <div className="overflow-hidden rounded-[1.75rem] bg-[#ecece9]">
          <video
            ref={videoRef}
            key={videoSrc}
            className="aspect-[4/5] w-full object-cover"
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setMode("live")}
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#ecece9] p-5 sm:p-8">
          <div className="relative mx-auto flex max-w-md flex-col gap-3">
            <span
              className="absolute bottom-4 left-[1.15rem] top-8 w-px"
              style={{ backgroundColor: `${accent}33` }}
            />
            {steps.map((step, index) => (
              <article
                key={`${step.text}-${index}`}
                className={cn(
                  "relative z-[1] flex w-full items-start gap-3 rounded-2xl bg-paper px-4 py-3.5 shadow-card transition-all duration-500",
                  index < visible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0",
                )}
              >
                {step.from === "kob" ? (
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center">
                    <GreenOrb size="sm" soft />
                  </span>
                ) : step.from === "done" ? (
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/photos/owner-face.jpg"
                    alt=""
                    className="mt-0.5 size-8 shrink-0 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {step.chip ? (
                    <p
                      className="mb-1 text-xs font-semibold"
                      style={{ color: step.chipColor ?? accent }}
                    >
                      {step.chip}
                    </p>
                  ) : null}
                  <p className="text-[0.95rem] leading-relaxed text-ink">
                    {step.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
