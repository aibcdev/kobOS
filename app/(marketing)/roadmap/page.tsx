import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap | KOB",
  description: "What KOB is building next. None of this is live on the homepage.",
};

const ITEMS = [
  { title: "KOB Phone", detail: "Guest answering. Not live." },
  { title: "Direct ordering", detail: "Not live. KOB does not replace your ordering." },
  { title: "Win-back", detail: "Not live." },
  { title: "Waste Eye", detail: "Measured waste. Not live." },
  { title: "Reservations", detail: "Not live. Keep the booking system you have." },
] as const;

export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Roadmap</p>
      <h1 className="font-display mt-3 text-headline font-medium">On the roadmap</h1>
      <p className="mt-4 text-ink">These jobs are not live. Joining the list does not switch them on.</p>
      <ul className="mt-8 space-y-4">
        {ITEMS.map((item) => (
          <li key={item.title} className="rounded-[1.75rem] border border-line bg-paper p-6">
            <h2 className="font-medium text-espresso">{item.title}</h2>
            <p className="mt-2 text-sm text-ink">{item.detail}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">On the roadmap</p>
            <a
              className="mt-4 inline-flex text-sm font-medium underline underline-offset-4"
              href={`mailto:hello@trykob.com?subject=${encodeURIComponent(`Waitlist: ${item.title}`)}`}
            >
              Join the waitlist
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
