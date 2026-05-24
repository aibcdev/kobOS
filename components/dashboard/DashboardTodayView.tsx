import Link from "next/link";
import { GrowthAgentBriefingPanel } from "@/components/dashboard/GrowthAgentBriefingPanel";
import { RecommendationActions } from "@/components/dashboard/RecommendationActions";
import {
  appBtnPrimary,
  appBtnSecondary,
  appCardSurface,
  appCodeInline,
  appLinkMuted,
} from "@/lib/app-ui-classes";
import type { OverviewMetrics } from "@/lib/dashboard/overview-metrics";
import type { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import type { GrowthInsight, InsightPriority, InsightType, Recommendation, RecommendationType } from "@prisma/client";

type RecWithInsight = Recommendation & { insight: GrowthInsight | null };

type Digest = Awaited<ReturnType<typeof buildDigestSnapshot>>;

function withR(restaurantId: string, path: string) {
  return `${path}?r=${encodeURIComponent(restaurantId)}`;
}

function insightAlertLabel(type: InsightType): string {
  const map: Record<InsightType, string> = {
    SLOW_DAY_ALERT: "Slow day",
    TRAFFIC_DROP: "Traffic shift",
    COMPETITOR_WARNING: "Competitor move",
    SEO_OPPORTUNITY: "SEO opening",
    CAMPAIGN_IDEA: "Campaign idea",
    TREND_ALERT: "Trend",
    MENU_PERFORMANCE: "Menu performance",
    LOCAL_SEARCH_GAP: "Local search gap",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function priorityRing(p: InsightPriority) {
  if (p === "HIGH") return "ring-2 ring-red-500/40 bg-red-50/80";
  if (p === "MEDIUM") return "ring-1 ring-amber-500/30 bg-amber-50/60";
  return "ring-1 ring-[var(--color-hairline)] bg-[var(--color-surface-soft)]";
}

function opportunityLinks(restaurantId: string, type: RecommendationType) {
  const w = (path: string) => withR(restaurantId, path);
  const L = (path: string, label: string) => ({ href: w(path), label });
  const brand = L("/dashboard/brand", "Brand & visuals");
  const website = L("/dashboard/website", "Website");
  const reviews = L("/dashboard/reviews", "Reviews");
  const agent = L("/dashboard/growth-agent", "Growth Agent");
  if (type === "CREATE_BLOG" || type === "GENERATE_SEO_PAGE" || type === "POST_SOCIAL") return [brand, website, agent];
  if (type === "CREATE_CAMPAIGN" || type === "SEND_EMAIL") return [reviews, brand, agent];
  if (type === "UPDATE_HOMEPAGE" || type === "RUN_PROMOTION") return [website, reviews];
  if (type === "OPTIMIZE_MENU") return [brand, website];
  return [website, reviews];
}

function MetricTile({
  label,
  value,
  hint,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  sub?: string;
  /** Accent for flagship stats (e.g. visibility / health). */
  valueClass?: string;
}) {
  return (
    <div className={`${appCardSurface} flex flex-col gap-1 p-[var(--spacing-md)] ring-1 ring-[var(--color-border-soft)]`}>
      <p className="type-caption text-[var(--color-muted-medium)]">{label}</p>
      <p
        className={`type-title-sm font-semibold tabular-nums sm:text-3xl sm:leading-tight ${valueClass ?? "text-[var(--color-ink)]"}`}
      >
        {value}
      </p>
      {sub ? <p className="type-caption font-medium text-[var(--color-accent)]">{sub}</p> : null}
      {hint ? <p className="type-caption leading-snug text-[var(--color-muted-medium)]">{hint}</p> : null}
    </div>
  );
}

export function DashboardTodayView({
  greetingLabel,
  briefingAutoRun,
  restaurantName,
  city,
  state,
  restaurantId,
  recommendations,
  insights,
  digest,
  overviewMetrics,
  previewMode,
}: {
  /** e.g. Good morning — from server clock */
  greetingLabel: string;
  /** When true, Growth Agent briefing POST runs once on mount (uses OpenAI). */
  briefingAutoRun?: boolean;
  restaurantName: string;
  city: string | null;
  state: string | null;
  restaurantId: string;
  recommendations: RecWithInsight[];
  insights: GrowthInsight[];
  digest: Digest;
  overviewMetrics: OverviewMetrics;
  /** Hides API-backed actions when browsing with NEXT_PUBLIC_UI_PREVIEW. */
  previewMode?: boolean;
}) {
  const top = recommendations[0];
  const trafficSub =
    overviewMetrics.trafficChangePct == null
      ? overviewMetrics.trafficEventsThisWeek === 0 && overviewMetrics.trafficEventsPrevWeek === 0
        ? "No events yet"
        : "Baseline building"
      : `${overviewMetrics.trafficChangePct >= 0 ? "+" : ""}${overviewMetrics.trafficChangePct}% vs prior week`;

  const convRate =
    overviewMetrics.trafficEventsThisWeek > 0
      ? Math.round((overviewMetrics.conversionsThisWeek / overviewMetrics.trafficEventsThisWeek) * 1000) / 10
      : null;

  const reviewsSub =
    overviewMetrics.reviewsThisWeek === 0
      ? overviewMetrics.reviewsHint
      : overviewMetrics.reviewsAvgThisWeek != null
        ? `Avg ${overviewMetrics.reviewsAvgThisWeek}★`
        : `${overviewMetrics.reviewsThisWeek} in window`;

  return (
    <div className="mx-auto max-w-6xl px-[var(--spacing-md)] py-10">
      {previewMode ? (
        <p className="type-body-sm mb-6 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-50/80 px-4 py-3 text-amber-950">
          <strong className="font-semibold">UI preview</strong> — sample metrics only. Add Supabase +{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">DATABASE_URL</code> for real data.
        </p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-caption text-[var(--color-muted-medium)]">Today</p>
          <h1 className="type-title-md mt-1 font-head text-[clamp(1.65rem,3vw,2.35rem)] leading-tight text-[var(--color-ink)]">
            {greetingLabel} — <span className="text-[var(--color-primary)]">{restaurantName}</span>
          </h1>
          <p className="type-body-md mt-3 max-w-2xl text-pretty text-[var(--color-muted)]">
            Here&apos;s what&apos;s happening with your restaurant today — visibility, visuals, reviews, and your Growth
            Agent briefing.
          </p>
          <p className="type-body-sm mt-2 text-[var(--color-muted-medium)]">
            {city ?? ""}
            {state ? ` · ${state}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0">
          <Link href="/audit" className={`${appBtnSecondary} w-full no-underline sm:w-auto`}>
            Run visibility audit
          </Link>
          <Link
            href={withR(restaurantId, "/dashboard/growth-agent")}
            className={`${appBtnPrimary} w-full no-underline sm:w-auto`}
          >
            Open Growth Agent tools
          </Link>
        </div>
      </div>

      {/* Flagship metrics — parity with executive “Today” snapshot */}
      <section className="mt-10">
        <h2 className="type-caption font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
          At a glance
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Visibility score"
            value={overviewMetrics.visibilityScore != null ? String(overviewMetrics.visibilityScore) : "—"}
            sub={
              overviewMetrics.trafficChangePct != null && overviewMetrics.trafficChangePct > 0
                ? `Traffic momentum ${overviewMetrics.trafficChangePct >= 0 ? "+" : ""}${overviewMetrics.trafficChangePct}%`
                : undefined
            }
            hint={overviewMetrics.visibilityHint}
            valueClass="text-emerald-700 dark:text-emerald-400"
          />
          <MetricTile
            label="Visual health"
            value={overviewMetrics.visualHealthScore != null ? String(overviewMetrics.visualHealthScore) : "—"}
            hint={overviewMetrics.visualHealthHint}
            valueClass="text-amber-700 dark:text-amber-400"
          />
          <MetricTile
            label="Reviews (7d)"
            value={String(overviewMetrics.reviewsThisWeek)}
            sub={reviewsSub}
            hint={overviewMetrics.reviewsThisWeek > 0 ? "Imported or synced reviews" : "Add reviews in Reviews workspace"}
          />
          <MetricTile
            label="Traffic trend"
            value={
              overviewMetrics.trafficChangePct == null
                ? "—"
                : `${overviewMetrics.trafficChangePct >= 0 ? "+" : ""}${overviewMetrics.trafficChangePct}%`
            }
            sub={trafficSub}
            valueClass={
              overviewMetrics.trafficChangePct != null && overviewMetrics.trafficChangePct >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : undefined
            }
          />
        </div>
      </section>

      <section className="mt-12">
        <GrowthAgentBriefingPanel restaurantId={restaurantId} autoRun={Boolean(briefingAutoRun)} />
      </section>

      {/* Site signals */}
      <section className="mt-12">
        <h2 className="type-caption font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
          Site signals
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label="Direct visits (signal)"
            value={overviewMetrics.onlineSalesDisplay}
            hint={overviewMetrics.onlineSalesHint}
          />
          <MetricTile label="Traffic (7d events)" value={String(overviewMetrics.trafficEventsThisWeek)} sub={trafficSub} />
          <MetricTile
            label="Orders / conversions"
            value={String(overviewMetrics.conversionsThisWeek)}
            hint="CTA taps tracked on your site snippet"
          />
          <MetricTile
            label="App downloads"
            value={overviewMetrics.appDownloadsDisplay}
            hint={overviewMetrics.appDownloadsHint}
          />
        </div>
      </section>

      {/* Food photography CTA */}
      <section
        className={`${appCardSurface} mt-10 border border-amber-500/25 bg-gradient-to-br from-[var(--color-surface-warm)] to-[var(--color-surface-soft)] px-[var(--spacing-lg)] py-10 text-center`}
      >
        <h2 className="type-title-md text-[var(--color-ink)]">Your food deserves stronger visuals</h2>
        <p className="type-body-md mx-auto mt-3 max-w-xl text-pretty text-[var(--color-muted)]">
          Generate AI photo prompts and photography briefs tuned to your brand — one click in Growth Agent.
        </p>
        <Link href={withR(restaurantId, "/dashboard/growth-agent")} className={`${appBtnPrimary} mt-6 inline-block no-underline`}>
          Food photography prompts
        </Link>
      </section>

      {/* AI briefing + alerts */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className={`${appCardSurface} border-[var(--color-ink)]/10 bg-gradient-to-br from-[var(--color-surface-beige)] to-[var(--color-surface-soft)]`}>
          <p className="type-caption font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Top recommendation
          </p>
          <h2 className="type-title-md mt-2">Today&apos;s opportunity</h2>
          {top ? (
            <>
              <p className="type-body-md mt-3 font-medium text-[var(--color-ink)]">{top.title}</p>
              <p className="type-body-sm mt-2 text-pretty text-[var(--color-muted)]">{top.action}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {opportunityLinks(restaurantId, top.type).map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="type-button inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-text-warm)] no-underline hover:bg-[var(--color-surface-dark-hover)]"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="type-body-sm mt-4 text-[var(--color-muted)]">
              No recommendations yet. Connect data or POST{" "}
              <code className={appCodeInline}>/api/recommendations</code> to seed your first action.
            </p>
          )}
          <div className="mt-8 border-t border-[var(--color-hairline)] pt-6">
            <p className="type-caption text-[var(--color-muted-medium)]">One-click tools</p>
            {previewMode ? (
              <p className="type-body-sm mt-4 text-[var(--color-muted)]">
                API actions are off in UI preview. Connect Supabase + Postgres to use them.
              </p>
            ) : (
              <RecommendationActions restaurantId={restaurantId} />
            )}
          </div>
        </div>

        <div>
          <h2 className="type-title-sm">Alerts</h2>
          <p className="type-caption mt-1 text-[var(--color-muted-medium)]">Slow days, rankings, reviews, competitors</p>
          <ul className="mt-4 space-y-3">
            {insights.length === 0 ? (
              <li className={`${appCardSurface} type-body-sm text-[var(--color-muted)]`}>
                All clear — or connect integrations / enable GROWTH_SEED_DEMO for demo signals.
              </li>
            ) : (
              insights.map((i) => (
                <li key={i.id} className={`rounded-[var(--radius-md)] p-4 ${priorityRing(i.priority)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="type-caption font-semibold text-[var(--color-primary)]">
                      {insightAlertLabel(i.type)}
                    </span>
                    <span className="type-caption shrink-0 text-[var(--color-muted-medium)]">{i.priority}</span>
                  </div>
                  <p className="type-label-md mt-1 text-[var(--color-ink)]">{i.title}</p>
                  <p className="type-body-sm mt-1 text-[var(--color-muted)]">{i.description}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Quick stats + digest teaser */}
      <section className="mt-12">
        <h2 className="type-title-sm">Quick stats</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className={appCardSurface}>
            <p className="type-caption text-[var(--color-muted-medium)]">Conversion (site signals)</p>
            <p className="type-title-sm mt-2 font-semibold tabular-nums text-[var(--color-ink)]">
              {convRate != null ? `${convRate}%` : "—"}
            </p>
            <p className="type-caption mt-1 text-[var(--color-muted-medium)]">CTA events ÷ tracked interactions (7d)</p>
          </div>
          <div className={appCardSurface}>
            <p className="type-caption text-[var(--color-muted-medium)]">Fee savings vs third-party</p>
            <p className="type-title-sm mt-2 font-semibold text-[var(--color-ink)]">—</p>
            <p className="type-caption mt-1 text-[var(--color-muted-medium)]">
              Estimator when direct ordering is connected
            </p>
          </div>
          <div className={appCardSurface}>
            <p className="type-caption text-[var(--color-muted-medium)]">Top-selling items</p>
            <p className="type-title-sm mt-2 font-semibold text-[var(--color-ink)]">—</p>
            <p className="type-caption mt-1 text-[var(--color-muted-medium)]">POS sync (ordering tab) — roadmap</p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className={appCardSurface}>
          <p className="type-caption font-semibold text-[var(--color-primary)]">Teaser · redesign</p>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">
            Premium hero, warm surfaces, and a single dominant reservation CTA — open the Website workspace when you
            are ready to draft.
          </p>
          <Link href={withR(restaurantId, "/dashboard/website")} className={`${appLinkMuted} mt-3 inline-block`}>
            Open Website →
          </Link>
        </div>
        <div className={appCardSurface}>
          <p className="type-caption font-semibold text-[var(--color-primary)]">Teaser · content</p>
          <p className="type-body-sm mt-2 text-[var(--color-muted)]">
            Hyper-local landing pages and menu micro-copy tuned for search — jump into Content to generate drafts.
          </p>
          <Link href={withR(restaurantId, "/dashboard/content")} className={`${appLinkMuted} mt-3 inline-block`}>
            Open Content engine →
          </Link>
        </div>
      </section>

      {/* Digest strip */}
      <section className={`mt-12 ${appCardSurface}`}>
        <h2 className="type-title-sm">7-day signals</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-beige)] p-[var(--spacing-lg)] ring-1 ring-[var(--color-border-soft)]">
            <p className="type-caption text-[var(--color-muted-medium)]">Insights by status</p>
            <dl className="type-body-sm mt-3 space-y-2 text-[var(--color-muted)]">
              {Object.entries(digest.insightsByStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt>{k}</dt>
                  <dd className="font-medium text-[var(--color-ink)]">{v}</dd>
                </div>
              ))}
              {!Object.keys(digest.insightsByStatus).length ? (
                <p className="text-[var(--color-muted-medium)]">No insights in window yet.</p>
              ) : null}
            </dl>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-ink)] p-[var(--spacing-lg)] text-[var(--color-text-inverse)]">
            <p className="type-caption text-[var(--color-text-inverse-soft)]">Recommendation mix</p>
            <ul className="type-body-sm mt-3 max-h-36 space-y-1 overflow-auto text-[var(--color-text-inverse-muted)]">
              {Object.entries(digest.recommendationsByType).length ? (
                Object.entries(digest.recommendationsByType).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2 border-b border-white/10 pb-1">
                    <span>{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-[var(--color-on-dark)]">{v}</span>
                  </li>
                ))
              ) : (
                <li>No recommendations in this window.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Prioritized queue */}
      <section className="mt-14">
        <h2 className="type-title-md">Prioritized queue</h2>
        <div className="mt-6 space-y-4">
          {recommendations.length === 0 ? (
            <p className="type-body-sm text-[var(--color-muted)]">
              Run Inngest functions or POST <code className={appCodeInline}>/api/recommendations</code> to generate action
              items.
            </p>
          ) : null}
          {recommendations.map((rec) => (
            <article key={rec.id} className={appCardSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-caption rounded-[var(--radius-pill)] bg-[var(--color-surface-warm)] px-3 py-1 font-medium text-[var(--color-ink)] ring-1 ring-[var(--color-hairline)]">
                  {rec.type.replace(/_/g, " ")}
                </span>
                <span className="type-caption text-[var(--color-muted-medium)]">Impact {rec.impactScore}</span>
              </div>
              <h3 className="type-title-sm mt-3">{rec.title}</h3>
              <p className="type-body-md mt-2 font-medium leading-snug text-[var(--color-muted)]">{rec.action}</p>
              {rec.aiSummary ? (
                <p className="type-body-sm mt-3 text-pretty leading-relaxed text-[var(--color-muted-medium)]">
                  {rec.aiSummary}
                </p>
              ) : null}
              {rec.insight ? (
                <p className="type-caption mt-3 text-[var(--color-muted-medium)]">Linked insight: {rec.insight.title}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <Link href="/" className={`${appLinkMuted} mt-12 inline-block`}>
        Back home
      </Link>
    </div>
  );
}
