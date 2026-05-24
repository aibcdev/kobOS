import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const QUOTES = [
  "Finally a clear list of what to fix on our site—without paying an agency first.",
  "The scan showed gaps we did not know about on Google and mobile.",
  "Direct ordering on our own brand feels professional—and guests use it.",
  "Weekly priorities from the Growth Agent keep us focused.",
  "Setup was faster than our last website rebuild.",
  "We still use delivery apps for discovery, but repeat orders come direct.",
] as const;

function QuoteCard({ quote }: { quote: string }) {
  return (
    <div className="w-[300px] shrink-0 rounded-2xl bg-[#fbf8f5] p-6 text-left text-[#2c2c2c] shadow-md">
      <SaasIcon icon="solar:quote-up-square-linear" className="mb-3 text-2xl text-[#088924]/60" />
      <p className="text-sm leading-relaxed text-[#2c2c2c]/85">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-[#2c2c2c]/45">Independent operator</p>
    </div>
  );
}

export function SaasRatingsMarquee() {
  const track = [...QUOTES, ...QUOTES];

  return (
    <section className="relative mx-6 my-12 overflow-hidden rounded-[3rem] bg-[#094413] py-24 text-center text-[#fbf8f5] shadow-inner">
      <div className="mx-auto max-w-[83rem] px-6">
        <div className="mb-6 flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SaasIcon key={`star-${i}`} icon="solar:star-bold" className="text-2xl text-amber-400" />
          ))}
        </div>

        <h2 className="font-heading mx-auto mb-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
          Built for operators who want clarity—not guesswork
        </h2>
        <p className="mb-16 text-sm text-white/70">{marketingCopy.trustLine}</p>

        <div className="relative w-full overflow-hidden py-4">
          <div className="animate-marquee flex gap-6">
            {track.map((quote, idx) => (
              <QuoteCard key={`${idx}-${quote.slice(0, 12)}`} quote={quote} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
