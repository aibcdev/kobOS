const ROWS = [
  {
    name: "Google listing",
    detail: "Public hours, rating, review count — watched every morning",
    state: "Live now",
  },
  {
    name: "Website",
    detail: "Hours and menu on the site you already have",
    state: "Live now",
  },
  {
    name: "Invoices",
    detail: "Email ingest first. Photo of a paper note if that’s all you have.",
    state: "Live now",
  },
  {
    name: "Weather",
    detail: "Prep note when rain or cold will hit covers",
    state: "Live now",
  },
  {
    name: "POS",
    detail: "KOB does not replace your till. Connecting when the adapter verifies.",
    state: "Connecting",
  },
  {
    name: "Reservations",
    detail: "OpenTable, SevenRooms and the rest — connecting, not a clone.",
    state: "Connecting",
  },
  {
    name: "KOB Phone",
    detail: "When your team can’t answer, KOB can. Keep your number.",
    state: "Coming soon",
  },
];

export function Connect() {
  return (
    <section id="connect" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        One manager. The tools you already have.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Free listing and invoice tools work now. Phone answering is Coming soon — not
        another “Soon” buried with the till.
      </p>

      <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-line bg-cream">
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
                  row.state === "Live now"
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
