export function Serving() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        KOB does the manager work. You keep the restaurant.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <article
            key={card.title}
            className="rounded-[1.75rem] border border-line bg-cream p-7 sm:p-8"
            style={{ borderTopColor: card.accent, borderTopWidth: 3 }}
          >
            <p className="text-sm font-medium" style={{ color: card.accent }}>
              {card.title}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink">{card.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        You choose what KOB can handle automatically.
      </p>
    </section>
  );
}

const CARDS = [
  {
    title: "KOB watches the listing",
    body: "Hours drift across Google, the site, and the booker. KOB catches it in the morning and waits for Apply hours.",
    accent: "#4285F4",
  },
  {
    title: "KOB writes in your tone",
    body: "Five-stars go out as you. Complaints stay with you. No voucher unless you say so.",
    accent: "#e23c1a",
  },
  {
    title: "KOB reads the delivery note",
    body: "Send a photo. KOB checks the house rate and the gap versus dishes sold. The supplier note does not leave until you say yes.",
    accent: "#d85a3a",
  },
  {
    title: "KOB remembers the house",
    body: "Never discount Friday. Always handle 5-stars. Cut salad on a cold Tuesday. One note. Committed to memory.",
    accent: "#2f9e5f",
  },
];
