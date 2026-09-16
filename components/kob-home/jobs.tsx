"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Globe,
  MapPin,
  Megaphone,
  Star,
  UtensilsCrossed,
  Check,
  Phone,
  Beef,
} from "lucide-react";
import { AlvenRoleStage, type DemoStep } from "@/components/kob-home/alven-role-stage";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { JOBS, type JobKey } from "@/lib/kob/demo";
import { cn } from "@/lib/kob/utils";

const ICONS: Record<JobKey, typeof Star> = {
  reviews: Star,
  google: MapPin,
  website: Globe,
  kitchen: Beef,
  reservations: CalendarDays,
  marketing: Megaphone,
  events: UtensilsCrossed,
  reporting: BarChart3,
};

const ROLE_VIDEO: Partial<Record<JobKey, string>> = {
  reviews: "/video/role-reviews.mp4",
  google: "/video/role-google.mp4",
  website: "/video/role-website.mp4",
  kitchen: "/video/role-kitchen.mp4",
};

const ROLE_ACCENT: Partial<Record<JobKey, string>> = {
  reviews: "#e23c1a",
  google: "#4285F4",
  website: "#111111",
  kitchen: "#d85a3a",
};

const ROLE_CHIP: Partial<Record<JobKey, { label: string; color: string }>> = {
  reviews: { label: "Google", color: "#4285F4" },
  google: { label: "Google · Site", color: "#4285F4" },
  website: { label: "Website", color: "#111111" },
  kitchen: { label: "Invoice · Weather", color: "#d85a3a" },
};

function stepsFor(jobKey: JobKey, flow: DemoStep[]): DemoStep[] {
  const chip = ROLE_CHIP[jobKey];
  return flow.map((step, i) => {
    if (step.from === "kob" && i === 1 && chip) {
      return { ...step, chip: chip.label, chipColor: chip.color };
    }
    return step;
  });
}

export function Jobs() {
  const [active, setActive] = useState<JobKey>("kitchen");
  const job = JOBS.find((j) => j.key === active) ?? JOBS[0];
  const videoSrc = job.live ? ROLE_VIDEO[job.key] : undefined;
  const accent = ROLE_ACCENT[job.key] ?? "#e23c1a";

  return (
    <section id="jobs" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <div>
          <h2 className="font-display text-headline font-medium">
            KOB does what restaurant managers do
          </h2>
          <ul className="mt-8">
            {JOBS.map((item) => {
              const ItemIcon = ICONS[item.key];
              const on = active === item.key;
              return (
                <li key={item.key} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 py-3 text-left text-lg transition-colors duration-150",
                      on ? "text-espresso" : "text-subtle hover:text-ink",
                    )}
                  >
                    <ItemIcon className="size-4" strokeWidth={1.6} />
                    <span className="flex-1">{item.label}</span>
                    {item.live ? null : (
                      <span className="text-xs text-subtle">Soon</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {job.live ? (
          <AlvenRoleStage
            key={job.key}
            steps={stepsFor(job.key, job.flow)}
            videoSrc={videoSrc}
            accent={accent}
          />
        ) : (
          <div className="rounded-[1.75rem] bg-[#ecece9] p-5 sm:p-8">
            <div className="mx-auto flex max-w-md flex-col items-stretch gap-3">
              {job.flow.map((step, index) => (
                <div key={`${job.key}-${index}`} className="flex flex-col items-center">
                  {index > 0 ? (
                    <span className="mb-3 h-6 w-px bg-line-strong" />
                  ) : null}
                  <article className="w-full rounded-2xl bg-paper px-4 py-4 shadow-card">
                    <div className="flex items-start gap-3">
                      {step.from === "kob" ? (
                        <span className="inline-flex size-8 shrink-0">
                          <GreenOrb size="sm" soft />
                        </span>
                      ) : step.from === "done" ? (
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
                          <Check className="size-3.5" strokeWidth={2.5} />
                        </span>
                      ) : step.from === "call" ? (
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage">
                          <Phone className="size-3.5" />
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/photos/owner-face.jpg"
                          alt=""
                          className="size-8 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.95rem] leading-relaxed text-ink">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
