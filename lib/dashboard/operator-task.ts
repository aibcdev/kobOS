/**
 * Owner-facing Today task presentation — verb-first titles, guest-language why,
 * journey stage, and concrete CTAs (not audit jargon).
 */

export type OperatorTaskKind =
  | "reply_reviews"
  | "add_photos"
  | "fix_cta"
  | "gbp_basics"
  | "demand_offer"
  | "website"
  | "generic";

export type OperatorTaskView = {
  id: string;
  kind: OperatorTaskKind | "demand";
  title: string;
  why: string;
  stage: "Trust" | "Desire" | "Discovery" | "Conversion" | "Demand";
  minutes: number;
  customersDelta: number | null;
  ctaLabel: "Start" | "Open replies" | "Approve" | "Fix" | "Update photos";
  provenance?: string;
  category: string;
  rawTitle: string;
};

function classify(title: string, category: string, kind?: string): OperatorTaskKind | "demand" {
  if (kind === "demand") return "demand";
  const t = title.toLowerCase();
  if (t.includes("review") || category === "REVIEWS") return "reply_reviews";
  if (t.includes("photo")) return "add_photos";
  if (t.includes("cta") || t.includes("book") || t.includes("mobile") || t.includes("leak")) return "fix_cta";
  if (t.includes("google") || t.includes("gbp") || t.includes("listing") || t.includes("visibility")) {
    return "gbp_basics";
  }
  if (t.includes("website") || t.includes("ownership") || t.includes("site") || category === "SEO") {
    return "website";
  }
  if (t.includes("demand") || t.includes("offer") || t.includes("quiet")) return "demand_offer";
  return "generic";
}

const TEMPLATES: Record<
  Exclude<OperatorTaskKind, "generic"> | "demand",
  Omit<OperatorTaskView, "id" | "kind" | "category" | "rawTitle" | "customersDelta">
> = {
  reply_reviews: {
    title: "Reply to open Google reviews",
    why: "Guests check recent replies before they trust you enough to book.",
    stage: "Trust",
    minutes: 12,
    ctaLabel: "Open replies",
    provenance: "From your audit · high impact",
  },
  add_photos: {
    title: "Refresh your Google photos",
    why: "Fresh food and room shots help guests choose you over nearby places.",
    stage: "Desire",
    minutes: 15,
    ctaLabel: "Update photos",
    provenance: "From your audit · high impact",
  },
  fix_cta: {
    title: "Make the next step obvious on mobile",
    why: "Guests aren't sure whether to book, call, or order.",
    stage: "Conversion",
    minutes: 10,
    ctaLabel: "Fix",
    provenance: "From your audit · high impact",
  },
  gbp_basics: {
    title: "Complete your Google profile basics",
    why: "Categories, hours, and links so you show up more cleanly in search.",
    stage: "Discovery",
    minutes: 10,
    ctaLabel: "Start",
    provenance: "From your audit · high impact",
  },
  website: {
    title: "Put your name, address, and phone on every key page",
    why: "So Google and guests both trust it's really you.",
    stage: "Conversion",
    minutes: 15,
    ctaLabel: "Fix",
    provenance: "From your audit · high impact",
  },
  demand_offer: {
    title: "Approve a quiet-period offer",
    why: "Fill a soft daypart with one tap — we publish after you approve.",
    stage: "Demand",
    minutes: 2,
    ctaLabel: "Approve",
    provenance: "Quiet window · highest ROI",
  },
  demand: {
    title: "Approve a quiet-period offer",
    why: "Fill a soft daypart with one tap — we publish after you approve.",
    stage: "Demand",
    minutes: 2,
    ctaLabel: "Approve",
    provenance: "Quiet window · highest ROI",
  },
};

/**
 * Turn analytical / vague task titles into operator actions.
 *
 * `customersPerMonth` is only ever what the audit itself estimated — pass null and
 * the row shows no number rather than an invented one.
 */
export function toOperatorTask(input: {
  id: string;
  title: string;
  detail?: string | null;
  impactLabel?: string | null;
  category: string;
  estimatedMinutes?: number;
  customersPerMonth?: number | null;
  /** Keep the audit's own wording instead of the plain-English template. */
  verbatim?: boolean;
  kind?: "task" | "demand";
}): OperatorTaskView {
  const kind = classify(input.title, input.category, input.kind);
  const base =
    kind === "generic"
      ? {
          title: verbFirstFallback(input.title),
          why:
            input.detail?.trim() ||
            input.impactLabel?.trim() ||
            "A clear next step for guests before they decide.",
          stage: stageFromCategory(input.category),
          minutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? input.estimatedMinutes : 10,
          ctaLabel: "Start" as const,
          provenance: "This week",
        }
      : { ...TEMPLATES[kind] };

  if (input.verbatim) {
    base.title = input.title.trim() || base.title;
  }
  // The audit's own explanation beats generic template copy.
  if (input.detail?.trim()) {
    base.why = input.detail.trim();
  }

  // Prefer a concrete demand title when we have one.
  if ((kind === "demand" || kind === "demand_offer") && input.title.trim()) {
    const cleaned = input.title.replace(/^Demand\s*[—–-]\s*/i, "").trim();
    if (cleaned && !/^approve/i.test(cleaned)) {
      base.title = cleaned.length > 60 ? `Approve: ${cleaned.slice(0, 52)}…` : `Approve: ${cleaned}`;
    }
  }

  const customersDelta =
    input.customersPerMonth != null && input.customersPerMonth > 0 ? input.customersPerMonth : null;

  return {
    id: input.id,
    kind,
    category: input.category,
    rawTitle: input.title,
    customersDelta,
    ...base,
    minutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? input.estimatedMinutes : base.minutes,
  };
}

function verbFirstFallback(title: string): string {
  const t = title.trim();
  if (/^(address|improve|fix|review|update|add|reply|complete|make|put|approve)\b/i.test(t)) {
    // Soften audit jargon
    return t
      .replace(/^Address\s+\d+[–-]\d+%\s+booking leak/i, "Make the next step obvious on mobile")
      .replace(/^Improve website ownership/i, "Put your name, address, and phone on key pages")
      .replace(/^Improve google visibility/i, "Complete your Google profile basics");
  }
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
}

function stageFromCategory(category: string): OperatorTaskView["stage"] {
  if (category === "REVIEWS") return "Trust";
  if (category === "SEO" || category === "SOCIAL") return "Discovery";
  if (category === "CONTENT") return "Desire";
  if (category === "MARKETING") return "Demand";
  return "Conversion";
}

export function ctaHrefForOperatorTask(
  task: OperatorTaskView,
  restaurantId: string,
  withRestaurantQuery: (path: string, id: string) => string,
): string {
  switch (task.kind) {
    case "reply_reviews":
      return withRestaurantQuery("/dashboard/reviews", restaurantId);
    case "add_photos":
    case "gbp_basics":
      return withRestaurantQuery("/dashboard/listings", restaurantId);
    case "fix_cta":
    case "website":
      return withRestaurantQuery("/dashboard/website", restaurantId);
    case "demand":
    case "demand_offer":
      return withRestaurantQuery("/dashboard/demand-engine", restaurantId);
    default:
      return withRestaurantQuery("/dashboard/requests", restaurantId);
  }
}
