import { Check } from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { Phone } from "@/components/kob-home/phone";

export function Channels() {
  return (
    <section className="relative overflow-hidden bg-espresso py-14 sm:py-16">
      <img
        src="/photos/channels-blur.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-espresso/45" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl text-paper">
          <h2 className="font-display text-headline font-medium text-paper">
            Send KOB a message. Give KOB the job.
          </h2>
          <p className="mt-6 text-lg text-paper/80">
            WhatsApp, email, or here. “We’re closed next Monday.” KOB prepares
            Google, the website and the booking page — then waits.
          </p>
        </div>

        <Phone>
          <div className="space-y-3">
            <div className="mb-4 flex items-center gap-2 px-1">
              <KobMark size="sm" />
              <p className="text-sm font-medium">KOB</p>
            </div>
            <article className="rounded-2xl bg-paper p-3.5 shadow-card">
              <div className="flex gap-2">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-espresso text-[0.65rem] font-medium text-paper">
                  You
                </span>
                <p className="text-sm leading-relaxed text-ink">
                  We’re closed next Monday. Bank holiday.
                </p>
              </div>
            </article>
            <article className="rounded-2xl bg-paper p-3.5 shadow-card">
              <div className="flex gap-2">
                <KobMark size="sm" />
                <p className="text-sm leading-relaxed text-ink">
                  I’ll prepare the hours on Google and the site.
                </p>
              </div>
            </article>
            <div className="flex justify-center py-1">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-sage text-paper">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
            </div>
            <article className="rounded-2xl bg-paper p-3.5 shadow-card">
              <div className="flex gap-2">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-espresso text-[0.65rem] font-medium text-paper">
                  You
                </span>
                <p className="text-sm text-ink">Apply hours.</p>
              </div>
            </article>
            <article className="rounded-2xl bg-paper p-3.5 shadow-card">
              <div className="flex gap-2">
                <KobMark size="sm" />
                <p className="text-sm leading-relaxed text-ink">
                  Done. Hours aligned on Google and the site. I’ll keep watching.
                </p>
              </div>
            </article>
          </div>
        </Phone>
      </div>
    </section>
  );
}
