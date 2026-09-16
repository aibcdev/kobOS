const CLAIMS = [
  "KOB will cut your food waste by at least 33% — or your money back.",
  "KOB will save you at least 30 hours of work — or your money back.",
  "KOB will grow your restaurant’s positioning and popularity in your area.",
];

export function Claims() {
  return (
    <section className="bg-paper text-espresso">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-3 lg:gap-12 lg:py-20">
        {CLAIMS.map((claim) => (
          <p
            key={claim}
            className="font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl"
          >
            {claim}
          </p>
        ))}
      </div>
      <p className="mx-auto max-w-5xl px-5 pb-10 text-[0.7rem] text-espresso/45 sm:px-8">
        You still approve anything public.
      </p>
    </section>
  );
}
