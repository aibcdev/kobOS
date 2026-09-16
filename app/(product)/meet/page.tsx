"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/kob-ui/button";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { SiteNav } from "@/components/kob-site/site-nav";
import { DEMO_RESTAURANTS } from "@/lib/kob/demo";
import { useKobStore } from "@/lib/kob/store";
import { cn } from "@/lib/kob/utils";

const LOOKING = [
  "Google listing",
  "Reviews",
  "Website",
  "Opening hours",
  "Booking links",
];

export default function MeetPage() {
  const storeRestaurant = useKobStore((s) => s.restaurant);
  const onboardProfile = useKobStore((s) => s.onboardProfile);
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);
  const connectGoogle = useKobStore((s) => s.connectGoogle);
  const restaurant = storeRestaurant ?? DEMO_RESTAURANTS[0];
  const router = useRouter();

  const [tick, setTick] = useState(0);
  const lookingDone = tick >= LOOKING.length;

  useEffect(() => {
    if (!storeRestaurant) hydrateRestaurant(DEMO_RESTAURANTS[0]);
  }, [hydrateRestaurant, storeRestaurant]);

  useEffect(() => {
    if (lookingDone) return;
    const t = window.setTimeout(() => setTick((n) => n + 1), 380);
    return () => window.clearTimeout(t);
  }, [tick, lookingDone]);

  function start(connect: boolean) {
    if (connect) connectGoogle();
    router.push("/app");
  }

  return (
    <div className="kob-employee min-h-dvh bg-bone text-espresso font-sans">
      <SiteNav />
      <main className="mx-auto max-w-xl px-5 pt-28 pb-20 sm:px-8">
        <div className="flex items-center gap-3">
          <KobMark size="lg" working={!lookingDone} />
          <div>
            <p className="text-sm text-muted">KOB</p>
            <p className="font-medium">{restaurant.name}</p>
          </div>
        </div>

        {!lookingDone ? (
          <div className="mt-10">
            <h1 className="font-display text-title font-medium">
              Taking {restaurant.name} from here…
            </h1>
            <ul className="mt-6 space-y-2">
              {LOOKING.map((item, index) => (
                <li
                  key={item}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors duration-200",
                    index < tick ? "bg-sage-soft text-sage" : "bg-cream text-subtle",
                  )}
                >
                  {index < tick ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            <h1 className="font-display text-headline font-medium">
              I’ll take {restaurant.name} from here.
            </h1>

            {onboardProfile ? (
              <article className="space-y-3 rounded-[1.75rem] bg-cream p-5 text-sm text-ink">
                <p className="font-medium text-espresso">
                  First read — {onboardProfile.roleLabel}
                </p>
                <p>{onboardProfile.googlePerformance.summary}</p>
                <p>{onboardProfile.popularity.summary}</p>
                <p>{onboardProfile.websiteView.summary}</p>
                <p>
                  Likely focus: <strong>{onboardProfile.biggestIssue.label}</strong> —{" "}
                  {onboardProfile.biggestIssue.why}
                </p>
                <p className="text-muted">
                  Team guess: ~{onboardProfile.staffEstimate.range}.{" "}
                  {onboardProfile.dayToDayFocus[0]}
                </p>
              </article>
            ) : null}

            <article className="rounded-[1.75rem] bg-cream p-5">
              <div className="flex gap-3">
                <KobMark size="sm" />
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
                  {`I’ll watch public Google, reviews, the website and hours.

Drafts stay in Talk until you approve. I do not post to Google from here yet.

You talk. I take the job.`}
                </p>
              </div>
            </article>

            <div className="flex flex-col gap-3 pt-2">
              <Button size="lg" onClick={() => start(true)}>
                Start KOB
              </Button>
              <Button size="lg" variant="outline" onClick={() => start(false)}>
                Talk first
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
