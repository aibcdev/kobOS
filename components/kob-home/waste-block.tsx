export function WasteBlock() {
  return (
    <section id="waste" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <p className="text-sm font-medium text-muted">Waste · two different jobs</p>
      <h2 className="font-display text-headline mt-3 max-w-2xl font-medium">
        Predictive prep is not measured waste
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm font-medium text-sage">Prep · BETA</p>
          <p className="mt-3 text-lg text-ink">
            Actionable quantities from weather and bookings when connected — so the
            kitchen preps what it will sell.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-line bg-paper p-7 sm:p-8">
          <p className="text-sm font-medium text-muted">Waste Eye · Coming next</p>
          <p className="mt-3 text-lg text-ink">
            Camera + scale measured waste. We will not call estimates “measured.”
          </p>
        </div>
      </div>
    </section>
  );
}
