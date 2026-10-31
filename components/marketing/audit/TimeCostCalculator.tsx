"use client";

import { useState } from "react";

/**
 * What reviews and Google admin cost the owner in time, from their own numbers. No benchmark is assumed: every input
 * is the owner's estimate, prefilled with an example they're told to change.
 */
export function TimeCostCalculator({ priceLabel, currency }: { priceLabel: string; currency: string }) {
  const [reviews, setReviews] = useState(20);
  const [minutesPerReply, setMinutesPerReply] = useState(5);
  const [adminHoursPerWeek, setAdminHoursPerWeek] = useState(2);
  const [hourValue, setHourValue] = useState(20);

  const hours = (reviews * minutesPerReply) / 60 + (adminHoursPerWeek * 52) / 12;
  const worth = Math.round(hours * hourValue);
  const field = (label: string, value: number, set: (n: number) => void, step = 1) => (
    <label className="flex flex-col justify-between gap-1 text-sm">
      <span className="text-[#2c2c2c]/75">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
        className="h-11 w-full rounded-xl border border-[#2c2c2c]/15 bg-white px-3 text-base"
      />
    </label>
  );

  return (
    <div className="rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8" data-testid="time-cost-calculator">
      <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">What does this cost you in time?</h2>
      <p className="mt-2 text-sm text-[#2c2c2c]/70">Your own estimates. We&apos;ve filled in an example; change it to yours.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {field("New Google reviews a month", reviews, setReviews)}
        {field("Minutes to write one reply", minutesPerReply, setMinutesPerReply)}
        {field("Hours a week on Google listing and website admin", adminHoursPerWeek, setAdminHoursPerWeek, 0.5)}
        {field(`What an hour of your time is worth (${currency})`, hourValue, setHourValue)}
      </div>
      <p className="mt-6 text-lg text-[#2c2c2c]" role="status">
        That&apos;s about <strong>{hours.toFixed(1)} hours a month</strong>, worth about{" "}
        <strong>
          {currency}
          {worth.toLocaleString("en-GB")}
        </strong>{" "}
        of your time. KOB is {priceLabel} a month.
      </p>
      <p className="mt-2 text-sm text-[#2c2c2c]/70">
        With KOB, the replies and fixes arrive drafted every morning. You check them, tap once, and post.
      </p>
    </div>
  );
}
