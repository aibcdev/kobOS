export function CostWatch() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
      <h2 className="font-display text-headline max-w-xl font-medium">KOB watches what you’re paying</h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Supplier invoices should reach KOB by email. KOB tracks price rises and comparable
        pack cost. A photo of a paper note is a fallback, not the main job.
      </p>
      <div className="mt-8 max-w-lg rounded-[1.75rem] bg-cream p-7 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Illustration</p>
        <p className="mt-3 font-medium text-espresso">12oz takeaway cup</p>
        <p className="mt-4 text-ink">Current landed £0.077 each</p>
        <p className="text-ink">Comparable pack £0.068 each</p>
        <p className="mt-3 text-sm text-muted">Same size, material, spec, delivery window — example only.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-paper px-4 py-2 text-sm">Keep supplier</span>
          <span className="rounded-full bg-espresso px-4 py-2 text-sm text-paper">Switch next order</span>
        </div>
      </div>
    </section>
  );
}
