export function KitchenPrep() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        KOB helps the kitchen prep what it will actually sell
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm font-medium text-muted">Tomorrow · example</p>
          <p className="mt-4 text-3xl font-medium">Expected covers 84</p>
          <ul className="mt-6 space-y-2 text-ink">
            <li>Focaccia ↓ 12%</li>
            <li>Pastries ↓ 18%</li>
            <li>Chicken ↑ 6%</li>
            <li>Salad prep ↓ 9%</li>
          </ul>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-lg text-ink">
            Historical sales, bookings, weather, and house patterns. That is predictive
            waste prevention — not a measured waste percentage.
          </p>
          <p className="mt-4 text-sm text-muted">
            Waste Eye (camera + scale) is Coming soon. We will not mix estimates into
            measured waste.
          </p>
        </div>
      </div>
    </section>
  );
}
