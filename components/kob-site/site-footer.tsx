import Link from "next/link";
import { KobWordmark } from "@/components/kob-brand/kob-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <KobWordmark />
          <p className="text-muted">
            The AI restaurant manager. You talk. He takes the job.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-medium">Product</p>
          <a href="/#how" className="block text-muted hover:text-espresso">
            How it works
          </a>
          <a href="/#jobs" className="block text-muted hover:text-espresso">
            Jobs
          </a>
          <a href="/#proof" className="block text-muted hover:text-espresso">
            Proof
          </a>
          <a href="/#pricing" className="block text-muted hover:text-espresso">
            Pricing
          </a>
          <Link href="/signup" className="block text-muted hover:text-espresso">
            Try for free
          </Link>
          <Link href="/login" className="block text-muted hover:text-espresso">
            Log in
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-medium">Legal</p>
          <Link href="/privacy" className="block text-muted hover:text-espresso">
            Privacy policy
          </Link>
          <Link href="/terms" className="block text-muted hover:text-espresso">
            Terms &amp; conditions
          </Link>
          <Link href="/data-management" className="block text-muted hover:text-espresso">
            Data management policy
          </Link>
          <p className="text-muted">Independent restaurants and cafés, 1–5 locations.</p>
          <p className="text-muted">Nothing public goes live without you.</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} KOB · getkob.com</p>
          <p>Hire the manager. Keep the restaurant.</p>
        </div>
      </div>
    </footer>
  );
}
