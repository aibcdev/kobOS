import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · KOB",
  description: "How KOB handles your data when you run a free scan or use the platform.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[#2c2c2c]">
      <h1 className="font-heading text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/80">
        KOB (&quot;we&quot;) provides online visibility scans and a daily task helper for restaurants. This policy
        explains what we collect and why.
      </p>
      <h2 className="mt-8 text-lg font-semibold">What we collect</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#2c2c2c]/80">
        <li>Email and phone when you unlock a free audit report</li>
        <li>Restaurant name, website, and public listing data for your scan</li>
        <li>Account details when you start a trial or sign in</li>
      </ul>
      <h2 className="mt-8 text-lg font-semibold">How we use it</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/80">
        To deliver your report, build your daily task list, send sign-in emails, and improve the product. We do not sell
        your personal data.
      </p>
      <h2 className="mt-8 text-lg font-semibold">Contact</h2>
      <p className="mt-3 text-sm text-[#2c2c2c]/80">
        Questions:{" "}
        <a href="mailto:hello@trykob.com" className="text-[#094413] underline">
          hello@trykob.com
        </a>
      </p>
      <p className="mt-12 text-sm">
        <Link href="/" className="text-[#094413] underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
