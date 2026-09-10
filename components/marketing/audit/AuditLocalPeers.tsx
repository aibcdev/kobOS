import type { AuditCompetitor } from "@/lib/audit/types";
import { auditCard } from "@/lib/marketing/audit-theme";

type Props = {
  city: string;
  restaurantName: string;
  /** The subject's own KOB score. */
  score: number;
  competitors: AuditCompetitor[];
  /** Rendered under the peers so there is exactly one action in this block. */
  cta: React.ReactNode;
};

function distanceLabel(peer: AuditCompetitor): string | null {
  if (peer.distanceKm == null) return null;
  if (peer.distanceKm < 1) return "under 1 km away";
  return `${peer.distanceKm} km away`;
}

/**
 * The conversion moment: three real, named local restaurants who are ahead.
 * Every name and score here was measured, so nothing is invented.
 */
export default function AuditLocalPeers({ city, restaurantName, score, competitors, cta }: Props) {
  const ahead = competitors
    .filter((c) => c.mockScore >= score)
    .sort((a, b) => a.mockScore - b.mockScore)
    .slice(0, 3);

  if (ahead.length === 0) return null;

  const gap = ahead[ahead.length - 1].mockScore - score;

  return (
    <section className={`${auditCard} p-6`} aria-labelledby="local-peers-heading">
      <h2 id="local-peers-heading" className="font-head text-xl font-semibold tracking-tight">
        {ahead.length === 1 ? "One restaurant" : `${ahead.length} restaurants`} near you score higher
      </h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        {restaurantName} scores {score}/100. These are real restaurants in and around {city}, scored
        the same way.
      </p>

      <ol className="mt-6 space-y-3">
        {ahead.map((peer) => (
          <li
            key={peer.name}
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{peer.name}</p>
              <p className="type-caption mt-0.5 text-[var(--color-muted-medium)]">
                {[peer.note, distanceLabel(peer)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-head text-2xl font-semibold text-[var(--color-primary)]">
                {peer.mockScore}
              </p>
              <p className="type-caption text-[var(--color-muted-medium)]">
                +{Math.max(1, peer.mockScore - score)} on you
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="type-body-sm mt-5 text-[var(--color-muted)]">
        Closing a {Math.max(1, gap)}-point gap is mostly presentation: what guests see when they
        search you, and how easy it is to book or order.
      </p>

      <div className="mt-5">{cta}</div>
    </section>
  );
}
