const ROWS = [
  {
    name: "Google listing (public watch)",
    detail: "Public hours, rating, review count — watched every morning",
    state: "LIVE",
  },
  {
    name: "Website hours / menu check",
    detail: "Compare public site to Google. Write-back needs reconnect.",
    state: "BETA",
  },
  {
    name: "Invoices",
    detail: "Email ingest first. Photo OCR fallback when that is all you have.",
    state: "BETA",
  },
  {
    name: "Weather prep",
    detail: "Prep note when rain or cold will hit covers — if city is set.",
    state: "BETA",
  },
  {
    name: "Google write (hours / reviews post)",
    detail: "Needs Google Business reconnect + read-back before Done.",
    state: "CONNECTING",
  },
  {
    name: "POS",
    detail: "KOB does not replace your till. Connecting when the adapter verifies.",
    state: "CONNECTING",
  },
  {
    name: "Reservations",
    detail: "OpenTable, SevenRooms and the rest — connecting, not a clone.",
    state: "CONNECTING",
  },
  {
    name: "KOB Phone",
    detail: "Guest answering. Keep your number. Join beta waitlist.",
    state: "COMING NEXT",
  },
  {
    name: "Waste Eye",
    detail: "Measured waste with camera + scale — not live estimates.",
    state: "COMING NEXT",
  },
];

export function Connect() {
  return (
    <section id="connect" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        One manager. The tools you already have.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        Labels match readiness: LIVE, BETA, CONNECTING, or COMING NEXT. No “Live now”
        without a real adapter.
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
                  row.state === "LIVE"
                    ? "shrink-0 rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage"
                    : row.state === "BETA"
                      ? "shrink-0 rounded-full bg-paper px-3 py-1 text-xs font-medium text-espresso"
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
