import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | KOB",
  description: "KOB is the restaurant manager for independent restaurants and cafés.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">About</p>
      <h1 className="font-display mt-3 text-headline font-medium">KOB</h1>
      <p className="mt-6 text-ink">
        KOB is the restaurant manager for independent restaurants and cafés, one to five
        locations. Nothing goes public without your yes. After you approve, KOB checks the change
        is live.
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
