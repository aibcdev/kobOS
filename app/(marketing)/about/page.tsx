import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "About KOB",
  description:
    "KOB is the restaurant manager for independent restaurants and cafés. It drafts review replies and Google listing fixes, and you approve and post them in one tap.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">About</p>
      <h1 className="font-display mt-3 text-headline font-medium">KOB</h1>
      <p className="mt-6 text-ink">
        KOB is the restaurant manager for independent restaurants and cafés, one to five
        locations. KOB drafts the replies and fixes. You approve, tap once, and post. Nothing goes
        out without your OK.
      </p>
      {/* Founder name, phone and registered address are not invented here. */}
      <p className="mt-4 text-ink">
        Email{" "}
        <a className="underline" href="mailto:hello@trykob.com">
          hello@trykob.com
        </a>
        .
      </p>
    </main>
  );
}
