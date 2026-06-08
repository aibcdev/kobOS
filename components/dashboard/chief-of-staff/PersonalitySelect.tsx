"use client";

import type { AiPersonality } from "@prisma/client";
import { PERSONALITY_HINTS, PERSONALITY_LABELS } from "@/lib/chief-of-staff/types";
import { cosCard } from "@/lib/dashboard/chief-of-staff-theme";

const OPTIONS: AiPersonality[] = ["BALANCED", "WARM", "DIRECT", "CONCISE", "SASSY"];

export function PersonalitySelect({
  value,
  onChange,
  disabled,
}: {
  value: AiPersonality;
  onChange: (p: AiPersonality) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`${cosCard} p-5`}>
      <p className="text-sm font-medium text-[#1a1a1a]">AI personality</p>
      <p className="mt-1 text-xs text-[#888]">How KOB speaks in briefings and drafts.</p>
      <div className="relative mt-4">
        <select
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value as AiPersonality)}
          className="w-full appearance-none rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a]"
        >
          {OPTIONS.map((o) => (
            <option key={o} value={o}>
              {PERSONALITY_LABELS[o]}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-[#666]">{PERSONALITY_HINTS[value]}</p>
    </div>
  );
}
