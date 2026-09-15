"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { restaurantFromQuery } from "@/lib/kob/demo";
import { useKobStore } from "@/lib/kob/store";

export function ScanCta() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);

  function submit(event: FormEvent) {
    event.preventDefault();
    const restaurant = restaurantFromQuery(query || "The Mill Café");
    hydrateRestaurant(restaurant);
    router.push("/meet");
  }

  return (
    <section id="hire" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        Hire the manager. Keep the restaurant.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Point KOB at the room. KOB looks at Google, reviews and hours — then
        takes the job. You stay on the floor.
      </p>
      <form
        onSubmit={submit}
        className="mt-10 max-w-lg rounded-[1.75rem] bg-cream p-6 sm:p-8"
      >
        <label htmlFor="restaurant-name" className="text-sm font-medium">
          Which restaurant should KOB manage?
        </label>
        <Input
          id="restaurant-name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="The Mill Café, or paste a website"
          className="mt-3"
        />
        <Button type="submit" size="lg" className="mt-4 w-full">
          Hire KOB
        </Button>
      </form>
    </section>
  );
}
