import { appCardSurface } from "@/lib/app-ui-classes";
import type { WeeklyNps } from "@/lib/insights/customer-voice";

export function NpsTrendCard({ weekly }: { weekly: WeeklyNps[] }) {
  const values = weekly.map((w) => w.nps);
  const min = Math.min(-20, ...values);
  const max = Math.max(20, ...values);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const points = weekly
    .map((item, i) => {
      const x = (i / Math.max(1, weekly.length - 1)) * w;
      const y = h - ((item.nps - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={appCardSurface}>
      <h2 className="type-title-sm">Score trend</h2>
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="mt-4 w-full max-w-sm">
        <polyline fill="none" stroke="#a78bfa" strokeWidth="2" points={points} />
        {weekly.map((item, i) => {
          const x = (i / Math.max(1, weekly.length - 1)) * w;
          const y = h - ((item.nps - min) / range) * h;
          return <circle key={item.week} cx={x} cy={y} r="4" fill="#a78bfa" />;
        })}
      </svg>
    </div>
  );
}
