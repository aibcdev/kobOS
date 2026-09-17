const STEPS = [
  {
    n: "1",
    title: "Onboard in seconds",
    body: "Restaurant name, what matters now, how much KOB should run. That is the whole start.",
  },
  {
    n: "orb",
    title: "We learn what you need first",
    body: "Reviews, Google, hours, the site. KOB ranks the jobs from your answers — then talks to you in Talk.",
  },
  {
    n: "check",
    title: "Then we learn with you",
    body: "You approve. KOB remembers the house. Next morning is sharper. Nothing public without your yes.",
  },
];

export function Loop() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        How it works
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        We onboard in seconds. We learn what you need initially. Then we learn
        with you — while you stay on the floor.
      </p>
      <ol className="mt-8 space-y-4">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="flex items-center gap-4 rounded-full bg-paper px-5 py-4 shadow-card sm:px-6"
          >
            <span
              className={
                step.n === "orb"
                  ? "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-paper"
                  : "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-sm font-medium text-espresso"
              }
            >
              {step.n === "orb" ? (
                <span className="size-4 rounded-full bg-paper/90 shadow-inner" />
              ) : step.n === "check" ? (
                "✓"
              ) : (
                step.n
              )}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-espresso">{step.title}</p>
              <p className="mt-0.5 hidden text-sm text-muted sm:block">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-sm font-medium text-espresso">What KOB takes on</p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Reviews, Google hours, the website, invoice photos, waste, and weather prep.
        You approve. Phone and the till stay Coming soon.
      </p>
    </section>
  );
}
