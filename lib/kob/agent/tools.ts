import type { RestaurantContext } from "./context";
import type { DataSource, ToolCallRecord } from "./types";

export type ToolResult = {
  ok: boolean
  tool: string
  source: DataSource
  call: ToolCallRecord
  data?: unknown
  needsConnection?: { system: string; cta: string; href?: string }
  error?: string
};

function src(
  id: string,
  label: string,
  status: DataSource["status"],
  kind: DataSource["kind"] = "none",
): DataSource {
  return { id, kind, label, status, freshAt: new Date().toISOString() };
}

/** Read local morning findings — demo/store grounded, never invented metrics. */
export function toolGetAttention(ctx: RestaurantContext): ToolResult {
  const needs = ctx.findings.filter((f) => f.status === "needs");
  const handled = ctx.findings.filter((f) => f.status === "done");
  return {
    ok: true,
    tool: "get_attention",
    source: src("findings", "Morning findings", "DEMO", "store"),
    call: { name: "get_attention", status: "ok", detail: `${needs.length} need you · ${handled.length} handled` },
    data: { needs, handled },
  };
}

export function toolGetRecentReviews(ctx: RestaurantContext): ToolResult {
  if (!ctx.integrations.google) {
    return {
      ok: false,
      tool: "get_recent_reviews",
      source: src("google", "Google listing", "DISCONNECTED"),
      call: { name: "get_recent_reviews", status: "skipped", detail: "Google not watching" },
      needsConnection: {
        system: "Google",
        cta: "Watch public Google",
      },
    };
  }
  return {
    ok: true,
    tool: "get_recent_reviews",
    source: src("google", "Google reviews (demo pack)", "DEMO", "demo"),
    call: { name: "get_recent_reviews", status: "ok", detail: `${ctx.reviews.length} reviews loaded` },
    data: { reviews: ctx.reviews },
  };
}

export function toolGetHours(ctx: RestaurantContext): ToolResult {
  const googleOn = ctx.integrations.google;
  const siteOn = ctx.integrations.website;
  if (!googleOn && !siteOn) {
    return {
      ok: false,
      tool: "get_restaurant_hours",
      source: src("google", "Hours sources", "DISCONNECTED"),
      call: { name: "get_restaurant_hours", status: "skipped" },
      needsConnection: { system: "Google or website", cta: "Open kitchen to connect" },
    };
  }
  return {
    ok: true,
    tool: "get_restaurant_hours",
    source: src("hours", "Public hours compare", googleOn ? "DEMO" : "STALE", "store"),
    call: { name: "get_restaurant_hours", status: "ok" },
    data: {
      google: ctx.restaurant.hoursGoogle,
      website: ctx.restaurant.hoursWebsite,
      mismatch: ctx.restaurant.hoursGoogle !== ctx.restaurant.hoursWebsite,
    },
  };
}

export function toolListInvoices(ctx: RestaurantContext): ToolResult {
  if (!ctx.integrations.accounting && !ctx.integrations.email) {
    return {
      ok: false,
      tool: "list_recent_invoices",
      source: src("accounting", "Supplier invoices", "DISCONNECTED"),
      call: { name: "list_recent_invoices", status: "skipped" },
      needsConnection: {
        system: "Invoice inbox / photos",
        cta: "Connect invoices",
      },
    };
  }
  // Connected but no real ingest yet — honest DEMO sample, labelled
  return {
    ok: true,
    tool: "list_recent_invoices",
    source: src("accounting", "Invoice demo lines", "DEMO", "demo"),
    call: { name: "list_recent_invoices", status: "ok", detail: "Example lines — not live inbox ingest" },
    data: {
      demo: true,
      lines: [
        {
          sku: "SALMON_001",
          name: "Salmon",
          previousNormalizedPrice: 8.41,
          currentNormalizedPrice: 9.55,
          unit: "kg",
          changePct: 13.56,
        },
        {
          sku: "CUP_12OZ",
          name: "12oz takeaway cups",
          previousNormalizedPrice: 0.071,
          currentNormalizedPrice: 0.077,
          unit: "each",
          changePct: 8.45,
        },
      ],
    },
  };
}

export function toolGetPrepForecast(ctx: RestaurantContext): ToolResult {
  if (!ctx.integrations.pos) {
    return {
      ok: false,
      tool: "generate_prep_forecast",
      source: src("pos", "POS / till", "DISCONNECTED"),
      call: { name: "generate_prep_forecast", status: "skipped" },
      needsConnection: {
        system: "POS",
        cta: "Connect POS",
      },
    };
  }
  return {
    ok: true,
    tool: "generate_prep_forecast",
    source: src("pos", "POS sales", "LIVE", "api"),
    call: { name: "generate_prep_forecast", status: "ok" },
    data: {},
  };
}

export function toolGetMeasuredWaste(_ctx: RestaurantContext): ToolResult {
  return {
    ok: false,
    tool: "get_measured_waste",
    source: src("waste", "Waste Eye", "DISCONNECTED"),
    call: { name: "get_measured_waste", status: "skipped" },
    needsConnection: {
      system: "Waste Eye",
      cta: "Learn about Waste Eye",
    },
    error: "No measured waste source at this location",
  };
}

export function toolGetReservations(_ctx: RestaurantContext): ToolResult {
  return {
    ok: false,
    tool: "get_reservations",
    source: src("bookings", "Reservations", "DISCONNECTED"),
    call: { name: "get_reservations", status: "skipped" },
    needsConnection: {
      system: "Reservations",
      cta: "Connect bookings",
    },
  };
}

export function toolProposeHoursClose(
  ctx: RestaurantContext,
  dayLabel: string,
): ToolResult {
  const targets: string[] = [];
  if (ctx.integrations.google) targets.push("Google");
  if (ctx.integrations.website) targets.push("Website");
  if (!targets.length) {
    return {
      ok: false,
      tool: "propose_hours_close",
      source: src("google", "Hours write", "DISCONNECTED"),
      call: { name: "propose_hours_close", status: "skipped" },
      needsConnection: { system: "Google", cta: "Watch public Google first" },
    };
  }
  return {
    ok: true,
    tool: "propose_hours_close",
    source: src("hours", "Hours change proposal", "DEMO", "store"),
    call: { name: "propose_hours_close", status: "ok", detail: `Close ${dayLabel} on ${targets.join(" + ")}` },
    data: {
      day: dayLabel,
      targets,
      bookingsConnected: Boolean(ctx.integrations.bookings),
      note: "Write to live Google GBP is not verified until OAuth reconnect succeeds.",
    },
  };
}
