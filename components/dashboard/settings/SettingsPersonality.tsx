"use client";

import { PersonalitySelect } from "@/components/dashboard/chief-of-staff/PersonalitySelect";
import type { AiPersonality } from "@prisma/client";
import { useState } from "react";
import { appCardSurface } from "@/lib/app-ui-classes";

export function SettingsPersonality({
  restaurantId,
  initial,
}: {
  restaurantId: string;
  initial: AiPersonality;
}) {
  const [value, setValue] = useState(initial);

  async function onChange(p: AiPersonality) {
    setValue(p);
    await fetch("/api/restaurant/personality", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, aiPersonality: p }),
    });
  }

  return (
    <div className={`mt-10 ${appCardSurface}`}>
      <h2 className="type-title-sm">How your helper talks to you</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Warm, direct, or concise—pick the tone for your daily tasks and drafts.
      </p>
      <div className="mt-4">
        <PersonalitySelect value={value} onChange={onChange} />
      </div>
    </div>
  );
}
