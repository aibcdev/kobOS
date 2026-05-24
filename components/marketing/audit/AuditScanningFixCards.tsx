"use client";

import { useMemo } from "react";

type FixCard = {
  initials: string;
  label: string;
  when: string;
  text: string;
  accent: string;
};

function buildCards(restaurantName: string, city: string): FixCard[] {
  const place = city && city !== "Your area" ? city : "your area";
  const shortName = restaurantName.split(/\s+/)[0] || "your restaurant";

  return [
    {
      initials: "MO",
      label: "Mobile experience",
      when: "Common gap",
      accent: "bg-[#094413]",
      text: `Guests on phones struggle with small menu text and buried booking buttons — we flag this for ${shortName} before they bounce.`,
    },
    {
      initials: "PH",
      label: "Food photography",
      when: "High impact",
      accent: "bg-[#5c4a3a]",
      text: "Listing photos that look nothing like the room hurt trust. We surface which shots to replace first so search and social match the real experience.",
    },
    {
      initials: "SE",
      label: "Local search",
      when: `In ${place}`,
      accent: "bg-[#2c5282]",
      text: `Missing pages for “best [cuisine] in ${place}” and weak meta titles cost covers every week. Your report lists the keywords worth owning.`,
    },
    {
      initials: "RV",
      label: "Reviews & replies",
      when: "Reputation",
      accent: "bg-[#6b4c7a]",
      text: "Slow or generic replies read as indifferent. We show reply patterns that turn one-star feedback into a second visit.",
    },
  ];
}

export function AuditScanningFixCards({
  restaurantName,
  city,
  visibleCount = 4,
}: {
  restaurantName: string;
  city: string;
  visibleCount?: number;
}) {
  const cards = useMemo(() => buildCards(restaurantName, city), [restaurantName, city]);
  const shown = cards.slice(0, Math.max(1, Math.min(cards.length, visibleCount)));

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-xs text-[#888580] md:text-left">
        Examples of issues we flag in your report — not live Google reviews.
      </p>
      {shown.map((card, i) => (
        <article
          key={card.initials}
          className="audit-fix-card-in rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5 shadow-sm"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="flex gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${card.accent}`}
              aria-hidden
            >
              {card.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-[#2c2c2c]">{card.label}</span>
                <span className="text-xs text-[#888580]">{card.when}</span>
              </div>
              <div className="mt-1 text-amber-500" aria-hidden>
                ★★★★★
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#555452]">{card.text}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
