const ROWS = [
  {
    name: "Google listing",
    detail: "Public hours, rating, review count — watched every morning",
    state: "Free",
    accent: "#4285F4",
    mark: "G",
  },
  {
    name: "Website",
    detail: "Hours and menu on the site you already have",
    state: "Free",
    accent: "#111111",
    mark: "W",
  },
  {
    name: "Invoice photo & food waste",
    detail:
      "Snap a delivery note. House rate vs the line, waste vs covers, draft supplier note — approve only.",
    state: "Free",
    accent: "#d85a3a",
    mark: "£",
  },
  {
    name: "Weather",
    detail:
      "Prep cuts when rain or cold will hit covers — less overcook, less waste",
    state: "Free",
    accent: "#1a73e8",
    mark: "°",
  },
  {
    name: "Till / bookings / WhatsApp",
    detail:
      "Paid partners. KOB uses them when they land — KOB does not replace them.",
    state: "Soon",
    accent: "#25D366",
    mark: "·",
  },
];

export function Connect() {
  return (
    <section id="connect" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        Add KOB to the tools you already have
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Two minutes. No demo call. Free tools work now — listings, site, invoices,
        food waste flags, weather. Nothing public leaves without you.
      </p>

      <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-line bg-cream">
        <div
          className="border-b border-line px-6 py-5 sm:px-8"
          style={{ borderLeft: "4px solid #e23c1a" }}
        >
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
              <div className="flex gap-3">
                <span
                  className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-paper"
                  style={{ backgroundColor: row.accent }}
                  aria-hidden
                >
                  {row.mark}
                </span>
                <div>
                  <p className="font-medium text-espresso">{row.name}</p>
                  <p className="mt-1 text-sm text-muted">{row.detail}</p>
                </div>
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
