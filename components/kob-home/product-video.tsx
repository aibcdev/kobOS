export function ProductVideo() {
  return (
    <section id="watch" className="mx-auto max-w-6xl px-5 py-14 sm:py-16 sm:px-8">
      <p className="text-sm text-muted">Meet KOB</p>
      <h2 className="font-display text-headline mt-3 max-w-2xl font-medium">
        You talk. KOB takes the job.
      </h2>
      <p className="mt-5 max-w-xl text-lg text-ink">
        KOB watches the listing, writes into Google and the site, drafts reviews
        in your tone, and flags invoice surprises. You choose what goes on
        autopilot.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        <li className="rounded-[1.75rem] bg-cream px-5 py-4 text-sm text-ink">
          <span className="font-medium text-espresso">Talk on the floor</span> —
          hours, reviews, a photo of the delivery note
        </li>
        <li className="rounded-[1.75rem] bg-cream px-5 py-4 text-sm text-ink">
          <span className="font-medium text-espresso">Work in your tools</span> —
          Google, the website, the inbox. Not a second dashboard
        </li>
        <li className="rounded-[1.75rem] bg-cream px-5 py-4 text-sm text-ink">
          <span className="font-medium text-espresso">Approve-only</span> — no
          surprise posts, no silent supplier notes
        </li>
        <li className="rounded-[1.75rem] bg-cream px-5 py-4 text-sm text-ink">
          <span className="font-medium text-espresso">Multi-site ready</span> —
          same house rules across locations. You stay in charge*
        </li>
      </ul>
      <div className="mt-10 overflow-hidden rounded-[1.75rem] bg-espresso">
        <div className="relative aspect-video">
          <video
            className="size-full object-cover"
            poster="/photos/hero-interior.jpg"
            controls
            playsInline
            preload="metadata"
          >
            <source src="/video/kob-what-is.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
      <p className="mt-4 text-[0.65rem] text-subtle">
        Product demo. No customer brand in this film.
      </p>
    </section>
  );
}
