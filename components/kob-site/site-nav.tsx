"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { KobWordmark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { cn } from "@/lib/kob/utils";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];

export function SiteNav({ onPhoto = false }: { onPhoto?: boolean; solid?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5 shadow-nav",
          onPhoto
            ? "bg-paper/80 text-espresso backdrop-blur-md"
            : "bg-paper/90 text-espresso backdrop-blur-md",
        )}
      >
        <Link href="/"
          className="flex h-9 items-center rounded-full px-3"
          aria-label="KOB home"
        >
          <KobWordmark />
        </Link>

        <nav className="hidden items-center md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="flex h-9 items-center rounded-full px-3 text-sm text-ink hover:bg-espresso/5"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link href="/login"
          className="hidden h-9 items-center rounded-full px-3 text-sm text-ink hover:bg-espresso/5 md:inline-flex"
        >
          Log in
        </Link>
        <Button size="sm" className="hidden md:inline-flex" asChild>
          <Link href="/onboard">Try for free</Link>
        </Button>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full text-espresso md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="pointer-events-auto absolute top-14 w-[min(20rem,calc(100vw-2rem))] rounded-3xl bg-paper p-3 shadow-soft md:hidden">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block rounded-2xl px-3 py-3 text-ink"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link href="/login"
            className="block rounded-2xl px-3 py-3 text-ink"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
          <Button className="mt-1 w-full" asChild>
            <Link href="/onboard">Try for free</Link>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
