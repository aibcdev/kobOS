"use client";

import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

const TESTIMONIALS = [
  {
    quote:
      "KOB showed us gaps we didn't even know existed. Recovered thousands in lost revenue in 60 days.",
    name: "Mike Maynard",
    venue: "Tin Lizzy's",
  },
  {
    quote: "The daily list keeps us focused on what actually moves the needle. Game changer.",
    name: "Brian Jennings",
    venue: "Chickie's & Pete's",
  },
  {
    quote: "More reviews, more visits, more revenue. Simple as that.",
    name: "Bert Ramadel",
    venue: "Tin Lizzy's",
  },
] as const;

export function SaasSignupTestimonials() {
  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, TESTIMONIALS.length - 1);

  return (
    <section className="bg-[#f9f6f1] px-6 py-12 md:py-16">
      <div className="mx-auto max-w-[83rem]">
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <article
              key={t.name + t.venue}
              className={`rounded-2xl bg-[#ebe6df] p-6 transition-opacity md:opacity-100 ${
                i === page ? "opacity-100" : "hidden opacity-0 md:block"
              }`}
            >
              <SaasIcon icon="solar:quote-up-bold" className="text-2xl text-[var(--color-forest-mid)]" />
              <p className="mt-4 text-[15px] leading-relaxed text-[#1a1a1a]">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                  <p className="text-xs text-[#2c2c2c]/55">{t.venue}</p>
                </div>
                <p className="font-heading text-sm tracking-tight text-[#2c2c2c]/35">{t.venue}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2 md:hidden">
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2c2c2c]/15 bg-white text-[#1a1a1a] disabled:opacity-40"
          >
            <SaasIcon icon="solar:arrow-left-linear" />
          </button>
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2c2c2c]/15 bg-white text-[#1a1a1a] disabled:opacity-40"
          >
            <SaasIcon icon="solar:arrow-right-linear" />
          </button>
        </div>
      </div>
    </section>
  );
}
