const TOOLS_NOW = [
  { name: "Google listing", color: "#4285F4", bg: "#e8f0fe" },
  { name: "Website", color: "#111111", bg: "#f4f4f2" },
  { name: "Invoice photo", color: "#d85a3a", bg: "#fbece8" },
  { name: "Weather", color: "#1a73e8", bg: "#e8f0fe" },
  { name: "Email", color: "#ea4335", bg: "#fce8e6" },
];

const TOOLS_SOON = [
  { name: "Till / POS", color: "#5f6368", bg: "#f1f3f4" },
  { name: "Bookings", color: "#5f6368", bg: "#f1f3f4" },
  { name: "WhatsApp", color: "#25D366", bg: "#e7f8ee" },
  { name: "Delivery apps", color: "#5f6368", bg: "#f1f3f4" },
];

export function Employee() {
  return (
    <section id="employee" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        KOB isn’t a dashboard. KOB is an employee who uses your tools.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        KOB watches the listing, writes into Google and the site, drafts reviews
        in your tone, and flags invoice surprises before they hit the till.
        You do not sit in KOB. KOB sits in the tools you already have.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-line bg-cream p-7 sm:p-8">
          <p className="text-sm font-medium text-sage">Works now — free</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOOLS_NOW.map((item) => (
              <li
                key={item.name}
                className="rounded-full px-4 py-2 text-sm font-medium shadow-card"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                {item.name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink">
            Point KOB at the listing, the site URL, an inbox, and a delivery
            photo. KOB starts this morning.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-line bg-cream p-7 sm:p-8">
          <p className="text-sm text-muted">Paid partners — soon</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOOLS_SOON.map((item) => (
              <li
                key={item.name}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                {item.name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink">
            The till and the booker come later. KOB does not replace them. KOB
            uses them — with your yes.
          </p>
          <p className="mt-4 text-xs text-muted">
            Example venues use Langosteria* colours for clarity — not a customer claim.
          </p>
        </article>
      </div>
    </section>
  );
}
