import { appCardSurface } from "@/lib/app-ui-classes";
import type { NpsBreakdown } from "@/lib/insights/customer-voice";

export function NpsGaugeCard({ nps }: { nps: NpsBreakdown }) {
  const needleAngle = ((nps.nps + 100) / 200) * 180 - 90;

  return (
    <div className={appCardSurface}>
      <h2 className="type-title-sm">Review score index</h2>
      <p className="type-caption mt-1 text-[var(--color-muted)]">Based on star ratings — not a formal NPS survey</p>
      <div className="relative mx-auto mt-6 h-32 w-48">
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#fecaca" strokeWidth="12" />
          <path d="M 55 45 A 80 80 0 0 1 145 45" fill="none" stroke="#fed7aa" strokeWidth="12" />
          <path d="M 100 20 A 80 80 0 0 1 180 100" fill="none" stroke="#bbf7d0" strokeWidth="12" />
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos((needleAngle * Math.PI) / 180)}
            y2={100 + 60 * Math.sin((needleAngle * Math.PI) / 180)}
            stroke="var(--color-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="6" fill="var(--color-ink)" />
        </svg>
        <p className="absolute inset-x-0 bottom-0 text-center text-2xl font-bold text-[var(--color-ink)]">
          {nps.nps > 0 ? "+" : ""}
          {nps.nps}
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <Bar label="Promoters" pct={nps.promoterPct} color="#22c55e" />
        <Bar label="Passives" pct={nps.passivePct} color="#f59e0b" />
        <Bar label="Detractors" pct={nps.detractorPct} color="#ef4444" />
      </div>
      <p className="type-caption mt-4 text-[var(--color-muted)]">
        {nps.promoters} promoters, {nps.passives} passives, {nps.detractors} detractors
      </p>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[var(--color-muted)]">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[var(--color-surface-warm)]">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
