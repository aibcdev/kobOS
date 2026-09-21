"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/kob-ui/button";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { VoicePill, StatusMark } from "@/components/kob-micro";
import { speakAsKob } from "@/lib/kob/tts";

type Phase = "idle" | "listening" | "brief";

export function Hero() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");

  function handleTranscript(text: string) {
    setPhase("brief");
    const reply =
      "Two things need you. Supplier salmon is up thirteen percent, and one complaint needs a response.";
    if (!reduce) speakAsKob(reply);
  }

  return (
    <section className="relative min-h-dvh overflow-hidden bg-espresso">
      <img
        src="/photos/hero-interior.jpg"
        alt="Looking through glass into a quiet independent restaurant"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-espresso/30" />

      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col justify-end px-5 pb-28 pt-28 sm:px-8 lg:justify-center lg:pb-32 lg:pt-32">
        <div className="max-w-xl text-paper">
          <p className="text-xs font-medium tracking-[0.14em] text-paper/75 uppercase">
            The AI restaurant manager
          </p>
          <h1 className="font-display text-display mt-4 font-medium tracking-[-0.05em] text-paper">
            KOB runs the work
            <br />
            around your restaurant.
          </h1>
          <p className="mt-5 max-w-md text-lg text-paper/80">
            Google, reviews, hours, costs, and prep — you approve before anything
            public.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="cream" asChild>
              <Link
                href="/onboard"
                onClick={() => {
                  void import("@/lib/kob/analytics").then((m) => m.trackKob("hero_try_clicked"));
                }}
              >
                Try KOB free
              </Link>
            </Button>
            <Button size="lg" variant="frost" asChild>
              <Link
                href="/login"
                onClick={() => {
                  void import("@/lib/kob/analytics").then((m) => m.trackKob("hero_talk_clicked"));
                }}
              >
                Talk to KOB
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4 sm:bottom-10 sm:px-5">
        <div className="pointer-events-auto w-full max-w-md min-w-0">
          <AnimatePresence mode="wait">
            {phase === "brief" ? (
              <motion.div
                key="brief"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full rounded-[1.5rem] bg-paper/95 p-5 text-espresso shadow-soft backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <KobMark size="sm" />
                  <p className="text-sm font-medium">2 things need you</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink">
                  <li className="flex min-w-0 items-start gap-2">
                    <StatusMark state="warning" />
                    <span className="min-w-0 flex-1">
                      Supplier salmon +13.2% vs last month — example
                    </span>
                  </li>
                  <li className="flex min-w-0 items-start gap-2">
                    <StatusMark state="warning" />
                    <span className="min-w-0 flex-1">One complaint needs a response</span>
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href="/onboard">Review in Talk</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPhase("idle")}
                  >
                    Ask again
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ask"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex w-full min-w-0 items-center gap-3 rounded-full bg-paper/95 py-2 pr-2 pl-3 shadow-soft backdrop-blur-sm"
              >
                <KobMark size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-muted">
                  {phase === "listening" ? "Listening…" : "Ask KOB anything…"}
                </p>
                <VoicePill
                  onListeningChange={(on) => {
                    if (on) setPhase("listening");
                  }}
                  onTranscript={handleTranscript}
                  demoFallback="What needs my attention today?"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
