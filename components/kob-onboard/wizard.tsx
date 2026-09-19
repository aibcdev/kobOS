"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { Button } from "@/components/kob-ui/button";
import { Input } from "@/components/kob-ui/input";
import { cn } from "@/lib/kob/utils";
import type { OnboardLens } from "@/lib/kob/onboard-lens";
import type { OnboardProfile } from "@/lib/kob/onboard-profile";
import { normalizeRole } from "@/lib/kob/onboard-profile";
import {
  EMPTY_ANSWERS,
  RUN_DETAIL,
  STEP_COPY,
  WIZARD_STEPS,
  chipsFor,
  findingsFromProfile,
  stepComplete,
  type MattersId,
  type OnboardAnswers,
  type RunLevelId,
} from "@/lib/kob/onboard-wizard";
import { useKobStore } from "@/lib/kob/store";
import { trackKob } from "@/lib/kob/analytics";

export function OnboardWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardAnswers>(EMPTY_ANSWERS);
  const [profile, setProfile] = useState<OnboardProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrateFromOnboard = useKobStore((s) => s.hydrateFromOnboard);
  const startNoCardTrial = useKobStore((s) => s.startNoCardTrial);
  const router = useRouter();

  useEffect(() => {
    trackKob("onboard_view");
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name")?.trim();
    if (name) {
      setAnswers((prev) => ({ ...prev, companyName: name }));
    }
    if (params.get("from") === "audit") {
      trackKob("audit_to_onboard", { audit: params.get("audit") ?? undefined });
    }
  }, []);

  const step = WIZARD_STEPS[stepIndex];
  const copy = STEP_COPY[step];
  const chips = chipsFor(step);
  const last = stepIndex === WIZARD_STEPS.length - 1;
  const canContinue = stepComplete(step, answers) || Boolean(copy.skippable);
  const findings = profile ? findingsFromProfile(profile) : [];

  function selectedIds(): string[] {
    switch (step) {
      case "role":
        return [answers.role];
      case "matters":
        return answers.matters ? [answers.matters] : [];
      case "run":
        return answers.run ? [answers.run] : [];
      default:
        return [];
    }
  }

  function pick(id: string) {
    setError(null);
    setAnswers((prev) => {
      const next = { ...prev };
      switch (step) {
        case "role":
          next.role = normalizeRole(id);
          break;
        case "matters":
          next.matters = id as MattersId;
          break;
        case "run":
          next.run = id as RunLevelId;
          break;
      }
      return next;
    });
  }

  async function lookupName() {
    const name = answers.companyName.trim();
    if (name.length < 2) {
      setError("Enter your restaurant name.");
      return false;
    }
    setLoading(true);
    setError(null);
    trackKob("restaurant_search_started", { name });
    try {
      const res = await fetch("/api/kob/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, role: answers.role }),
      });
      const data = (await res.json()) as { profile?: OnboardProfile; error?: string };
      if (!res.ok || !data.profile) {
        setError(data.error ?? "Could not look up that restaurant.");
        return false;
      }
      setProfile(data.profile);
      trackKob("restaurant_search_result_selected", {
        name: data.profile.name,
        source: data.profile.source,
      });
      trackKob("first_finding_viewed", { count: findingsFromProfile(data.profile).length });
      return true;
    } catch {
      setError("Something went wrong. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function finish(finalAnswers: OnboardAnswers) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kob/onboard/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: finalAnswers.companyName,
          answers: finalAnswers,
          profile,
        }),
      });
      const data = (await res.json()) as {
        profile?: OnboardProfile
        lens?: OnboardLens
        error?: string
      };
      if (!res.ok || !data.profile || !data.lens) {
        setError(data.error ?? "Could not finish setup.");
        return;
      }
      hydrateFromOnboard(data.profile, data.lens);
      startNoCardTrial();
      trackKob("trial_started");
      trackKob("signup_completed");
      router.push("/app");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function goNext(event?: FormEvent) {
    event?.preventDefault();
    if (step === "name") {
      const ok = await lookupName();
      if (!ok) return;
      setStepIndex(1);
      return;
    }

    if (!copy.skippable && !stepComplete(step, answers)) {
      setError("Pick one to continue.");
      return;
    }

    if (step === "account") {
      const nextAnswers: OnboardAnswers = {
        ...answers,
        run: answers.run ?? "assisted",
        matters: answers.matters ?? "covers",
        phone: "skip",
        start: answers.start.length ? answers.start : ["all"],
        scope: answers.scope ?? "one_room",
        book: answers.book.length ? answers.book : ["google"],
        chat: answers.chat.length ? answers.chat : ["email"],
        menu: answers.menu ?? "website",
      };
      await finish(nextAnswers);
      return;
    }

    setStepIndex((n) => n + 1);
  }

  return (
    <div className="kob-employee flex min-h-dvh flex-col bg-bone text-espresso font-sans">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-8 pt-28 sm:px-8 sm:pt-32">
        <div className="flex items-center gap-2">
          <GreenOrb size="sm" />
          <p className="text-sm font-medium text-[#c4a574]">KOB</p>
        </div>

        <h1 className="mt-8 font-display text-[1.85rem] font-medium tracking-[-0.03em] text-espresso sm:text-[2.15rem]">
          {copy.title}
        </h1>
        {copy.hint ? <p className="mt-3 max-w-xl text-sm text-muted">{copy.hint}</p> : null}

        {step === "name" ? (
          <form onSubmit={goNext} className="mt-10">
            <div className="relative">
              <Input
                value={answers.companyName}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="Barilla Kitchen, or your trading name"
                className="h-14 rounded-2xl pr-14 text-base"
                autoFocus
                disabled={loading}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-espresso text-paper disabled:opacity-40"
                disabled={loading}
                aria-label="Continue"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </button>
            </div>
          </form>
        ) : null}

        {step === "findings" && profile ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-espresso">
              {profile.name}
              {profile.city ? ` · ${profile.city}` : ""}
            </p>
            <ul className="space-y-3">
              {findings.map((line) => (
                <li key={line} className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink">
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Next: a few preferences, then your account — then Talk with this work ready.
            </p>
          </div>
        ) : null}

        {step === "role" || step === "matters" ? (
          <div className="mt-10 flex flex-wrap gap-3">
            {chips.map((chip) => {
              const on = selectedIds().includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => pick(chip.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border bg-paper px-4 py-3 text-left text-sm font-medium shadow-sm transition-shadow",
                    on
                      ? "border-espresso shadow-[0_8px_24px_-12px_rgba(17,17,17,0.45)]"
                      : "border-line hover:border-espresso/30",
                    "text-espresso",
                  )}
                >
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === "run" ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {(Object.keys(RUN_DETAIL) as RunLevelId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className={cn(
                  "rounded-2xl border bg-paper p-4 text-left",
                  answers.run === id ? "border-espresso" : "border-line",
                )}
              >
                <p className="text-sm font-medium capitalize">{id}</p>
                <p className="mt-3 text-xs text-muted">How will you see what I do?</p>
                <p className="mt-1 text-sm text-ink">{RUN_DETAIL[id].see}</p>
                <p className="mt-3 text-xs text-muted">How do you control me?</p>
                <p className="mt-1 text-sm text-ink">{RUN_DETAIL[id].control}</p>
              </button>
            ))}
          </div>
        ) : null}

        {step === "account" ? (
          <div className="mt-8 space-y-4">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link
                href={`/signup?next=${encodeURIComponent("/onboard?resume=1")}`}
                onClick={() => trackKob("signup_started")}
              >
                Continue with email / Google
              </Link>
            </Button>
            <p className="text-sm text-muted">
              Already have an account?{" "}
              <Link href={`/login?next=${encodeURIComponent("/app")}`} className="underline">
                Log in
              </Link>
            </p>
            <p className="text-xs text-muted">
              Or continue to Talk now — trial sticks on this device until you sign in.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-16">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="text-sm text-muted"
              onClick={() => setStepIndex((n) => Math.max(0, n - 1))}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          {step !== "name" ? (
            <Button size="lg" onClick={() => void goNext()} disabled={loading || !canContinue}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === "findings"
                ? "Continue"
                : last
                  ? "Start talking"
                  : "Continue"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
