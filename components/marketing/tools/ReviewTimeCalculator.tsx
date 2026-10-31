"use client";

import { useState } from "react";
import { cleanInputs, monthlyAdminHours, type ReviewTimeInputs } from "@/lib/marketing/tools/review-time";

const FIELDS: Array<{ key: keyof ReviewTimeInputs; name: string; label: string; step: string }> = [
  { key: "reviews", name: "reviews", label: "New reviews a month (Google and other sites, all locations)", step: "1" },
  { key: "minutesPerReply", name: "minutes", label: "Minutes to write one reply", step: "0.5" },
  { key: "locations", name: "locations", label: "Number of locations", step: "1" },
  { key: "weeklyListingMinutes", name: "listing", label: "Minutes a week per location updating hours, menus and listings", step: "5" },
];

/**
 * The owner's own numbers in, hours a month out. A plain GET form underneath, so it works without JavaScript: the
 * server reads the same query string and renders the answer.
 */
export function ReviewTimeCalculator({ initial, action }: { initial: ReviewTimeInputs; action: string }) {
  const [values, setValues] = useState<Record<keyof ReviewTimeInputs, string>>({
    reviews: String(initial.reviews),
    minutesPerReply: String(initial.minutesPerReply),
    locations: String(initial.locations),
    weeklyListingMinutes: String(initial.weeklyListingMinutes),
  });
  const hours = monthlyAdminHours(cleanInputs(values));

  return (
    <form method="get" action={action} className="rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8" data-testid="review-time-calculator">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col justify-between gap-1.5 text-sm">
            <span className="text-[#2c2c2c]/80">{f.label}</span>
            <input
              type="number"
              inputMode="decimal"
              name={f.name}
              min={0}
              step={f.step}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="h-11 w-full rounded-xl border border-[#2c2c2c]/20 bg-white px-3 text-base text-[#2c2c2c]"
            />
          </label>
        ))}
      </div>
      <p className="mt-6 text-lg text-[#2c2c2c]" role="status" aria-live="polite">
        That&apos;s about <strong>{hours.toFixed(1)} hours a month</strong> on review replies and listing admin.
      </p>
      <noscript>
        <button type="submit" className="mt-4 inline-flex h-11 items-center rounded-full bg-[#094413] px-5 text-sm font-medium text-white">
          Work it out
        </button>
      </noscript>
    </form>
  );
}
