const TOOLS_NOW = [
  "Google listing",
  "Website",
  "Invoice photo",
  "Weather",
  "Email",
];

const TOOLS_SOON = ["Till / POS", "Bookings", "WhatsApp", "Delivery apps"];

export function Employee() {
  return (
    <section id="employee" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
      <h2 className="font-display text-headline max-w-2xl font-medium">
        KOB isn’t a dashboard. He’s an employee who uses your tools.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        He watches the listing, writes into Google and the site, drafts reviews
        in your tone, and flags invoice surprises before they hit the till.
        You do not sit in KOB. KOB sits in the tools you already have.
      </p>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm text-muted">Works now — free</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOOLS_NOW.map((name) => (
              <li
                key={name}
                className="rounded-full bg-paper px-4 py-2 text-sm font-medium text-espresso shadow-card"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink">
            Point him at the listing, the site URL, an inbox, and a delivery
            photo. He starts this morning.
          </p>
        </article>
        <article className="rounded-[1.75rem] bg-cream p-7 sm:p-8">
          <p className="text-sm text-muted">Paid partners — soon</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOOLS_SOON.map((name) => (
              <li
                key={name}
                className="rounded-full bg-paper/70 px-4 py-2 text-sm text-muted"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink">
            The till and the booker come later. KOB does not replace them. He
            uses them — with your yes.
          </p>
        </article>
      </div>
    </section>
  );
}
