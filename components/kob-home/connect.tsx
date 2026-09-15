const ROWS = [
  {
    name: "Google listing",
    detail: "Public hours, rating, review count",
    state: "Free",
  },
  {
    name: "Website",
    detail: "Hours and menu on the site you already have",
    state: "Free",
  },
  {
    name: "Invoice photo",
    detail: "Snap a delivery note. House rate vs the line.",
    state: "Free",
  },
  {
    name: "Weather",
    detail: "Prep cuts when rain or cold will hit covers",
    state: "Free",
  },
  {
    name: "Till / bookings / WhatsApp",
    detail: "Paid partners. KOB uses them when they land — he does not replace them.",
    state: "Soon",
  },
];

export function Connect() {
  return (
    <section id="connect" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        Add KOB to the tools you already have
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Two minutes. No demo call. Free tools work now. Nothing public leaves
        the kitchen without you.
      </p>

      <div className="mt-12 overflow-hidden rounded-[1.75rem] bg-cream">
        <div className="border-b border-line px-6 py-5 sm:px-8">
          <p className="font-medium">Connect</p>
          <p className="mt-1 text-sm text-muted">
            Free tools work now. Paid partners show soon.
          </p>
        </div>
        <ul>
          {ROWS.map((row) => (
            <li
              key={row.name}
              className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 last:border-b-0 sm:px-8"
            >
              <div>
                <p className="font-medium text-espresso">{row.name}</p>
                <p className="mt-1 text-sm text-muted">{row.detail}</p>
              </div>
              <span
                className={
                  row.state === "Free"
                    ? "shrink-0 rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage"
                    : "shrink-0 rounded-full bg-paper px-3 py-1 text-xs text-subtle"
                }
              >
                {row.state}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
