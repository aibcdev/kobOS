const STEPS = [
  {
    n: "1",
    title: "You talk on the floor",
    body: "Closed Monday. Reply to last night. The cheddar line looks high. Say it once.",
  },
  {
    n: "orb",
    title: "KOB prepares the job in your tools",
    body: "Hours on Google and the site. A review in your tone. A supplier note from the photo. Ready before you leave the pass.",
  },
  {
    n: "check",
    title: "You approve — nothing goes live alone",
    body: "Apply hours. Leave it. No surprise posts. No silent supplier notes. You stay in charge.",
  },
];

export function Loop() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        You talk. KOB works. You stay in charge.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        KOB is not a dashboard you log into after service. He is the manager
        who uses your tools while you run the room.
      </p>
      <ol className="mt-14 space-y-4">
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
    </section>
  );
}
