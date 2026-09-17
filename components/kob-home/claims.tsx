"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const CLAIMS = [
  {
    title: "Save time",
    body: "KOB handles repetitive admin so the floor stays the floor.",
  },
  {
    title: "Lower costs",
    body: "KOB spots over-prep, over-ordering, and supplier overspend. Direct waste measurement stays Coming soon.",
  },
  {
    title: "Capture more revenue",
    body: "KOB is built to catch missed calls, bookings, and guest chances. Phone answering is Coming soon.",
  },
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
            <article key={claim.title}>
              <h2 className="font-display text-3xl font-medium tracking-tight">{claim.title}</h2>
              <p className="mt-3 text-ink">{claim.body}</p>
            </article>
          ))}
          <p className="text-[0.7rem] text-espresso/45">
            You choose what KOB can handle automatically.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={rail} className="relative h-[180vh] bg-paper text-espresso">
      <div className="sticky top-24 mx-auto flex h-[min(22rem,70vh)] max-w-3xl items-center overflow-hidden px-5 sm:px-8">
        {CLAIMS.map((claim, i) => (
          <ClaimSlide key={claim.title} claim={claim} index={i} active={active} />
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
  claim: (typeof CLAIMS)[number];
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
      <h2 className="font-display text-[1.85rem] font-medium leading-[1.15] tracking-tight sm:text-4xl">
        {claim.title}
      </h2>
      <p className="mt-4 max-w-xl text-lg text-ink">{claim.body}</p>
      {index === CLAIMS.length - 1 ? (
        <p className="mt-6 text-[0.7rem] text-espresso/45">
          You choose what KOB can handle automatically.
        </p>
      ) : null}
    </motion.article>
  );
}
