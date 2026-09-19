/** Lightweight conversion events for the hire funnel. Fails open. */

type KobEvent =
  | "homepage_view"
  | "hero_try_clicked"
  | "hero_talk_clicked"
  | "onboard_view"
  | "restaurant_search_started"
  | "restaurant_search_result_selected"
  | "first_finding_viewed"
  | "signup_started"
  | "signup_completed"
  | "first_action_proposed"
  | "first_action_approved"
  | "trial_started"
  | "audit_to_onboard";

export function trackKob(event: KobEvent, props?: Record<string, string | number | boolean | undefined>) {
  if (typeof window === "undefined") return;
  try {
    const detail = { event, ...props, t: Date.now() };
    window.dispatchEvent(new CustomEvent("kob:analytics", { detail }));
    const w = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer?.push?.({ event, ...props });
    if (typeof w.gtag === "function") {
      w.gtag("event", event, props ?? {});
    }
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[kob:analytics]", detail);
    }
  } catch {
    /* ignore */
  }
}
