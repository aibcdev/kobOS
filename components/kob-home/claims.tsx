"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const CLAIMS = [
  "KOB will cut your food waste by at least 33% — or your money back.",
  "KOB will save you at least 30 hours of work — or your money back.",
  "KOB will grow your restaurant’s positioning and popularity in your area.",
];

export function Claims() {
  const reduce = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: rail,
    offset: ["start start", "end end"],
  });
  const active = useTransform(scrollYProgress, [0, 0.12, 0.45, 0.55, 0.88, 1], [0, 0, 1, 1, 2, 2]);

  if (reduce) {
    return (
      <section className="bg-paper px-5 py-12 text-espresso sm:px-8">
        <div className="mx-auto max-w-2xl space-y-10">
          {CLAIMS.map((claim) => (
            <p key={claim} className="font-display text-3xl font-medium leading-snug tracking-tight">
              {claim}
            </p>
          ))}
          <p className="text-[0.7rem] text-espresso/45">You still approve anything public.</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={rail} className="relative h-[180vh] bg-paper text-espresso">
      <div className="sticky top-24 mx-auto flex h-[min(22rem,70vh)] max-w-3xl items-center overflow-hidden px-5 sm:px-8">
        {CLAIMS.map((claim, i) => (
          <ClaimSlide key={claim} claim={claim} index={i} active={active} />
        ))}
      </div>
    </section>
  );
}

function ClaimSlide({
  claim,
  index,
  active,
}: {
  claim: string;
  index: number;
  active: ReturnType<typeof useTransform<number, number>>;
}) {
  const opacity = useTransform(
    active,
    [index - 0.65, index - 0.2, index, index + 0.2, index + 0.65],
    [0, 1, 1, 1, 0],
  );
  const y = useTransform(active, [index - 1, index, index + 1], [36, 0, -36]);

  return (
    <motion.article
      style={{ opacity, y }}
      className="pointer-events-none absolute inset-x-0 px-5 sm:px-8"
    >
      <p className="font-display text-[1.85rem] font-medium leading-[1.15] tracking-tight sm:text-4xl">
        {claim}
      </p>
      {index === CLAIMS.length - 1 ? (
        <p className="mt-6 text-[0.7rem] text-espresso/45">You still approve anything public.</p>
      ) : null}
    </motion.article>
  );
}
