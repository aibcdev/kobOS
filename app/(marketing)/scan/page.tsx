"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { SiteFooter } from "@/components/kob-site/site-footer";
import { SiteNav } from "@/components/kob-site/site-nav";
import { DEMO_RESTAURANTS, searchRestaurants } from "@/lib/kob/demo";
import { useKobStore } from "@/lib/kob/store";

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchRestaurants(query), [query]);
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);
  const router = useRouter();

  function take(restaurant: (typeof DEMO_RESTAURANTS)[number]) {
    hydrateRestaurant(restaurant);
    router.push("/meet");
  }

  return (
    <div className="kob-employee min-h-dvh bg-bone text-espresso font-sans">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-8">
        <h1 className="font-display text-headline font-medium">
          Which restaurant should KOB take?
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink">
          Point KOB at the room. It looks, then it works. You stay on the floor
          — you don’t sit in another dashboard.
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            const restaurant = results[0];
            if (!restaurant) return;
            take(restaurant);
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, area, or website"
            autoFocus
          />
        </form>

        <ul className="mt-6 space-y-3">
          {(query ? results : DEMO_RESTAURANTS).map((restaurant) => (
            <li key={restaurant.id}>
              <button
                type="button"
                onClick={() => take(restaurant)}
                className="flex w-full items-center justify-between gap-4 rounded-[1.75rem] bg-cream px-5 py-4 text-left transition-colors duration-150 hover:bg-line"
              >
                <span>
                  <span className="block font-medium text-espresso">
                    {restaurant.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-3.5" />
                    {restaurant.area}, {restaurant.city}
                  </span>
                  <span className="mt-1 block text-sm text-subtle">
                    {restaurant.cuisine}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted">KOB will take this</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-muted">
          Don’t see it? Type the name anyway. KOB will still take a first look.
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => take(results[0] ?? DEMO_RESTAURANTS[0])}
          >
            Continue with this restaurant
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
