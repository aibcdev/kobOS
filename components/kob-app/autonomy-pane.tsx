"use client";

import { Button } from "@/components/kob-ui/button";
import { levelName, type AutonomyLevel } from "@/lib/kob/demo";
import { useKobStore } from "@/lib/kob/store";

const LEVELS: { id: AutonomyLevel; label: string }[] = [
  { id: "ask", label: "Suggest" },
  { id: "handle", label: "Autopilot" },
  { id: "always-ask", label: "Never" },
];

export function AutonomyPane() {
  const autonomy = useKobStore((s) => s.autonomy);
  const setAutonomy = useKobStore((s) => s.setAutonomy);
  const tone = useKobStore((s) => s.tone);
  const setTone = useKobStore((s) => s.setTone);
  const googleConnected = useKobStore((s) => s.googleConnected);
  const connectGoogle = useKobStore((s) => s.connectGoogle);
  const addMessage = useKobStore((s) => s.addMessage);
  const setPane = useKobStore((s) => s.setPane);

  function grant(id: string, level: AutonomyLevel, label: string) {
    setAutonomy(id, level);
    if (level === "handle") {
      addMessage({
        id: `auto-${id}-${Date.now()}`,
        role: "done",
        text: `${label} is on autopilot. I'll take that job from now on.`,
      });
      setPane("kob");
    }
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Autonomy</h1>
        <p className="mt-2 max-w-xl text-ink">
          Suggest, then approve, then autopilot. You grant this by talking — or
          move one job at a time here.
        </p>
      </div>

      <section className="space-y-3">
        {autonomy.map((rule) => {
          const copy =
            rule.level === "handle"
              ? rule.autopilot
              : rule.level === "always-ask"
                ? rule.never
                : rule.suggest;
          return (
            <article key={rule.id} className="rounded-[1.75rem] bg-cream p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{rule.label}</p>
                  <p className="mt-1 text-sm text-muted">{rule.detail}</p>
                </div>
                <p className="text-sm text-muted">{levelName(rule.level)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <Button
                    key={level.id}
                    size="sm"
                    variant={rule.level === level.id ? "espresso" : "outline"}
                    onClick={() => grant(rule.id, level.id, rule.label)}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink">{copy}</p>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="font-medium">How should KOB sound?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["friendly", "professional", "casual"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={tone === option ? "espresso" : "outline"}
              onClick={() => setTone(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-cream p-5 sm:p-6">
        <p className="font-medium">Google Business Profile</p>
        <p className="mt-1 text-sm text-muted">
          {googleConnected
            ? "Connected. KOB can take hours, reviews and listing details from here."
            : "Not connected yet. KOB can still watch the public listing and prepare the work."}
        </p>
        {!googleConnected ? (
          <Button size="sm" className="mt-3" onClick={connectGoogle}>
            Let KOB take Google
          </Button>
        ) : null}
      </section>
    </div>
  );
}
