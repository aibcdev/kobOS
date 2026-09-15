export function Serving() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        He does the manager work. You keep the restaurant.
      </h2>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <article key={card.title} className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
            <p className="text-sm text-muted">{card.title}</p>
            <p className="mt-4 text-lg leading-relaxed text-ink">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const CARDS = [
  {
    title: "He watches the listing",
    body: "Hours drift across Google, the site, and the booker. KOB catches it in the morning and waits for Apply hours.",
  },
  {
    title: "He writes in your tone",
    body: "Five-stars go out as you. Complaints stay with you. No voucher unless you say so.",
  },
  {
    title: "He reads the delivery note",
    body: "Send a photo. KOB checks the house rate and the gap versus dishes sold. The supplier note does not leave until you say yes.",
  },
  {
    title: "He remembers the house",
    body: "Never discount Friday. Always handle 5-stars. Cut salad on a cold Tuesday. One note. Committed to memory.",
  },
];
