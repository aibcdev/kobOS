"use client";

import { cosCard, cosSectionLabel } from "@/lib/dashboard/chief-of-staff-theme";

export function NeedToKnowCard({ items }: { items: string[] }) {
  const [top, ...rest] = items;

  return (
    <section className={`${cosCard} p-5`}>
      <p className={cosSectionLabel}>Need to know</p>
      {top ? (
        <>
          <p className="mt-3 text-sm font-medium leading-snug text-[#1a1a1a]">{top}</p>
          {rest.length ? (
            <ul className="mt-3 space-y-2 border-t border-[#f0f0f0] pt-3">
              {rest.map((line) => (
                <li key={line} className="text-sm leading-snug text-[#555]">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-[#888]">No critical alerts right now.</p>
      )}
    </section>
  );
}
