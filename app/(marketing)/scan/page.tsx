"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="font-display text-headline font-medium">Find your restaurant</h1>
      <p className="mt-4 max-w-xl text-lg text-ink">
        KOB reads what guests see: your Google listing, reviews and website. No logins needed to start.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const name = query.trim();
          router.push(name ? `/onboard?name=${encodeURIComponent(name)}` : "/onboard");
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Restaurant name or website"
          autoFocus
        />
        <Button type="submit">Find my restaurant</Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        Osteria Lume is a fictional example used in demos. It is not a customer.
      </p>
    </main>
  );
}
