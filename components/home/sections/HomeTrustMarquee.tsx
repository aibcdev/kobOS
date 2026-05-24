import type { HomepageContent } from "@/lib/homepage-merge";

type Quote = HomepageContent["quotesForHome"][number];
type Trust = HomepageContent["trustBand"];

type Props = {
  trustBand: Trust;
  quotes: Quote[];
};

export function HomeTrustMarquee({ trustBand, quotes }: Props) {
  const row = [...quotes, ...quotes];

  return (
    <section className="border-t border-[var(--color-hairline)] bg-[var(--color-primary)] px-[var(--spacing-md)] py-12 text-[var(--color-on-primary)] sm:py-16">
      <div className="mx-auto max-w-[1440px] text-center">
        <h2 className="type-title-md text-pretty !text-[var(--color-on-primary)]">{trustBand.heading}</h2>
        {trustBand.subheading ? (
          <p className="type-body-md mx-auto mt-3 max-w-2xl text-pretty !text-[var(--color-text-inverse-muted)]">{trustBand.subheading}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {trustBand.badges.map((b) => (
            <span
              key={b}
              className="type-caption rounded-[var(--radius-pill)] border border-white/25 bg-white/10 px-4 py-2 text-white/95"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="home-marquee-track flex w-max gap-4 pr-4">
          {row.map((q, i) => (
            <figure
              key={`${q.name}-${i}`}
              className="w-[min(320px,85vw)] shrink-0 rounded-[var(--radius-md)] border border-white/20 bg-white/10 px-5 py-4 text-left backdrop-blur-sm"
            >
              <blockquote className="type-body-md text-pretty leading-snug !text-white/95">&ldquo;{q.quote}&rdquo;</blockquote>
              <figcaption className="type-caption mt-3 !text-[var(--color-text-inverse-soft)]">
                <span className="type-label-md !text-white/95">{q.name}</span>
                {q.role ? <span> · {q.role}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
