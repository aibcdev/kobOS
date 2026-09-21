import { buildRestaurantContext, type RestaurantContext } from "./context";
import {
  classifyIntentSafe,
  isActionRequest,
  requiresRestaurantGrounding,
} from "./intent";
import {
  toolGetAttention,
  toolGetHours,
  toolGetMeasuredWaste,
  toolGetPrepForecast,
  toolGetRecentReviews,
  toolGetReservations,
  toolListInvoices,
  toolProposeHoursClose,
  type ToolResult,
} from "./tools";
import type {
  KobActionChip,
  KobCard,
  KobTurn,
  KobTurnType,
  ToolCallRecord,
} from "./types";
import type { Restaurant } from "@/lib/kob/demo-data";
import type { AutonomyRule, Finding, MemoryItem, Review } from "@/lib/kob/demo-data";
import type { ToolId } from "@/lib/kob/integrations";
import type { HouseRules } from "@/lib/kob/house-rules";

function uid() {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function turn(
  partial: Omit<KobTurn, "id" | "createdAt" | "confidence"> & { confidence?: number },
): KobTurn {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    confidence: partial.confidence ?? 0.9,
    ...partial,
  };
}

function connectionTurn(
  ctx: RestaurantContext,
  message: string,
  needs: NonNullable<ToolResult["needsConnection"]>,
  tools: ToolCallRecord[],
  intent: KobTurn["intent"],
): KobTurn {
  return turn({
    restaurantId: ctx.restaurant.id,
    intent,
    type: "NEEDS_CONNECTION",
    message,
    sources: [],
    toolCalls: tools,
    grounded: true,
    actions: [
      {
        id: "open-kitchen",
        label: needs.cta,
        kind: "connect",
      },
    ],
    meta: { genericFallbackBlocked: true, toolsRequired: [needs.system] },
  });
}

function dayFromText(text: string): string | null {
  const m = text.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  return m ? m[1]!.replace(/^\w/, (c) => c.toUpperCase()) : null;
}

export async function runKobTurn(input: {
  text: string
  restaurant: Restaurant
  connected: Record<ToolId, boolean>
  autonomy: AutonomyRule[]
  houseRules: HouseRules
  memory: MemoryItem[]
  findings: Finding[]
  reviews: Review[]
  pendingAction?: { kind: string; payload?: unknown } | null
}): Promise<KobTurn> {
  const ctx = buildRestaurantContext(input);
  const text = input.text.trim();
  const intent = classifyIntentSafe(text);
  const tools: ToolCallRecord[] = [];
  const sources: KobTurn["sources"] = [];

  // ——— APPROVAL ———
  if (intent === "APPROVAL") {
    if (!input.pendingAction) {
      return turn({
        restaurantId: ctx.restaurant.id,
        intent,
        type: "CLARIFICATION",
        message:
          "I don't have a pending action to approve. Tell me what to do — for example: close Monday, or reply to today's reviews.",
        sources: [],
        toolCalls: [],
        grounded: true,
      });
    }
    return turn({
      restaurantId: ctx.restaurant.id,
      intent,
      type: "ACTION_RESULT",
      message:
        "Queued for execution. Live Google / website write still needs reconnect before VERIFIED — I'll report Sent — waiting until then.",
      sources: [],
      toolCalls: [{ name: "approve_pending", status: "ok" }],
      grounded: true,
      meta: { actionVerbDetected: true },
    });
  }

  // ——— RULE / MEMORY ———
  if (intent === "RULE_MEMORY") {
    const neverCoffee = /coffee|supplier/i.test(text) && /never/i.test(text);
    const neverFriday = /friday/i.test(text) && /discount/i.test(text);
    const subject = neverCoffee
      ? "coffee supplier changes"
      : neverFriday
        ? "Friday discounts"
        : "that request";
    return turn({
      restaurantId: ctx.restaurant.id,
      intent,
      type: "RULE",
      message: `I'll remember: ${subject} are NEVER automatic. Confirm to save as a house rule.`,
      sources: [{ id: "memory", kind: "memory", label: "House rules", status: "LIVE" }],
      toolCalls: [{ name: "create_rule_candidate", status: "ok" }],
      grounded: true,
      actions: [
        { id: "save-rule", label: "Save rule", kind: "approve" },
        { id: "ignore", label: "Not now", kind: "ignore" },
      ],
      cards: [
        {
          id: "rule",
          title: "Rule candidate",
          body: neverCoffee
            ? "domain: procurement · subject: coffee · action: supplier_change · mode: NEVER"
            : neverFriday
              ? "domain: marketing · subject: friday · action: discount · mode: NEVER"
              : `Raw: ${text}`,
          tone: "warn",
        },
      ],
    });
  }

  // ——— ATTENTION / BRIEF ———
  if (/what needs|needs me|needs my attention|what did you|handled today|anything (for|need)/i.test(text)) {
    const r = toolGetAttention(ctx);
    tools.push(r.call);
    sources.push(r.source);
    const data = r.data as { needs: Finding[]; handled: Finding[] };
    const needs = data.needs;
    const handled = data.handled;
    if (!needs.length && !handled.length) {
      return turn({
        restaurantId: ctx.restaurant.id,
        intent: "RESTAURANT_QUESTION",
        type: "ANSWER",
        message:
          "Nothing needs you right now from what I can see. Connect Google and invoices and I can do substantially more.",
        sources,
        toolCalls: tools,
        grounded: true,
        actions: [{ id: "open-kitchen", label: "Open kitchen", kind: "connect" }],
      });
    }
    const lines = needs.slice(0, 4).map((f, i) => `${i + 1}. ${f.headline}`).join("\n");
    const done = handled.length
      ? `\n\nHandled locally in Talk: ${handled.length} item(s). Not verified on live Google until reconnect.`
      : "";
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: "FINDING",
      message: needs.length
        ? `${needs.length} thing${needs.length === 1 ? "" : "s"} need you.\n\n${lines}${done}`
        : `Nothing needs you. ${handled.length} item(s) already marked handled in this session.${done}`,
      sources,
      toolCalls: tools,
      grounded: true,
      cards: needs.slice(0, 3).map((f) => ({
        id: f.id,
        title: f.headline,
        body: f.detail,
        tone: "warn" as const,
      })),
      actions: needs.length
        ? [
            { id: "approve-all", label: "Take them", kind: "approve" },
            { id: "review", label: "Tell me first", kind: "yes" },
          ]
        : undefined,
    });
  }

  // ——— SUPPLIER / COST ———
  if (/supplier|invoice|price.*(up|rise|increas)|cost me more|food cost|gross margin.*week|why.*(cost|margin)/i.test(text)) {
    const r = toolListInvoices(ctx);
    tools.push(r.call);
    sources.push(r.source);
    if (r.needsConnection) {
      return connectionTurn(
        ctx,
        "I can't calculate supplier price changes yet because I'm not receiving your invoices.\n\nConnect the inbox they arrive in (or enable invoice photos), and I'll track every price automatically.",
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
      );
    }
    const lines = (r.data as { lines: Array<{
      name: string
      previousNormalizedPrice: number
      currentNormalizedPrice: number
      unit: string
      changePct: number
    }> }).lines;
    const cards: KobCard[] = lines.map((l) => ({
      id: l.name,
      title: l.name,
      body: `£${l.previousNormalizedPrice.toFixed(3)} → £${l.currentNormalizedPrice.toFixed(3)} / ${l.unit}\n+${l.changePct.toFixed(1)}%`,
      tone: "warn",
    }));
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: "FINDING",
      message:
        "Three items increased materially (example invoice pack — labelled DEMO until live inbox ingest).\n\nSalmon has the largest move at +13.6%/kg.",
      sources,
      toolCalls: tools,
      grounded: true,
      cards,
      actions: [
        { id: "review-salmon", label: "Review salmon", kind: "review" },
        { id: "find-alt", label: "Find alternative", kind: "yes" },
      ],
      meta: { genericFallbackBlocked: true },
    });
  }

  // ——— REVIEWS ———
  if (/review/i.test(text)) {
    const r = toolGetRecentReviews(ctx);
    tools.push(r.call);
    sources.push(r.source);
    if (r.needsConnection) {
      return connectionTurn(
        ctx,
        "I don't have reviews loaded yet. Turn on public Google watch in Kitchen and I'll draft replies from real reviews — I won't invent guest comments.",
        r.needsConnection,
        tools,
        isActionRequest(intent, text) ? "RESTAURANT_ACTION" : "RESTAURANT_QUESTION",
      );
    }
    const reviews = (r.data as { reviews: Review[] }).reviews;
    const open = reviews.filter((x) => x.status === "draft" || x.status === "escalate");
    if (isActionRequest(intent, text) || /reply|handle/i.test(text)) {
      return turn({
        restaurantId: ctx.restaurant.id,
        intent: "RESTAURANT_ACTION",
        type: "ACTION_PROPOSAL",
        message: open.length
          ? `I loaded ${reviews.length} reviews (${open.length} still open). Five-star drafts can go on your autopilot rule — complaints stay with you.\n\nNothing posts to Google until verified after reconnect. Take the drafts?`
          : `I loaded ${reviews.length} reviews. Nothing open right now.`,
        sources,
        toolCalls: tools,
        grounded: true,
        actions: open.length
          ? [
              { id: "approve-all", label: "Draft replies", kind: "approve" },
              { id: "ignore", label: "Leave it", kind: "ignore" },
            ]
          : undefined,
        meta: { actionVerbDetected: true, genericFallbackBlocked: true },
      });
    }
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: "FINDING",
      message: `${reviews.length} reviews in the current pack. ${open.length} still need a decision.`,
      sources,
      toolCalls: tools,
      grounded: true,
      cards: open.slice(0, 3).map((rv) => ({
        id: rv.id,
        title: `${rv.rating}★ ${rv.author}`,
        body: rv.text,
        tone: rv.rating <= 3 ? "warn" : "default",
      })),
    });
  }

  // ——— HOURS / CLOSED ———
  if (/hour|closed|close|open until|we're closed|we are closed/i.test(text)) {
    const day = dayFromText(text);
    if (day && /closed|close/i.test(text)) {
      const r = toolProposeHoursClose(ctx, day);
      tools.push(r.call);
      sources.push(r.source);
      if (r.needsConnection) {
        return connectionTurn(
          ctx,
          `I can't close ${day} on Google yet — listing watch isn't on.\n\nTurn on Google in Kitchen, then ask me again.`,
          r.needsConnection,
          tools,
          "RESTAURANT_ACTION",
        );
      }
      const data = r.data as { targets: string[]; bookingsConnected: boolean; note: string };
      const bookingLine = data.bookingsConnected
        ? "Reservations will be blocked too."
        : "Your reservation system isn't connected, so I can't block bookings there.";
      return turn({
        restaurantId: ctx.restaurant.id,
        intent: "RESTAURANT_ACTION",
        type: "ACTION_PROPOSAL",
        message: `I'll close ${day} on:\n${data.targets.map((t) => `· ${t}`).join("\n")}\n\n${bookingLine}\n\n${data.note}\n\nApply the connected systems?`,
        sources,
        toolCalls: tools,
        grounded: true,
        actions: [
          { id: "approve-hours", label: "Approve", kind: "approve" },
          { id: "ignore", label: "Cancel", kind: "ignore" },
        ],
        meta: { actionVerbDetected: true, genericFallbackBlocked: true },
      });
    }
    const r = toolGetHours(ctx);
    tools.push(r.call);
    sources.push(r.source);
    if (r.needsConnection) {
      return connectionTurn(
        ctx,
        "I can't compare hours yet. Connect Google or save your website URL in Kitchen.",
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
      );
    }
    const data = r.data as { google: string; website: string; mismatch: boolean };
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: data.mismatch ? "FINDING" : "ANSWER",
      message: data.mismatch
        ? `Hours disagree.\n\nGoogle: ${data.google}\nWebsite: ${data.website}\n\nI can propose one set — nothing public until you approve, and Done only after verify.`
        : `Google and website match:\n${data.google}`,
      sources,
      toolCalls: tools,
      grounded: true,
      actions: data.mismatch
        ? [
            { id: "approve-hours", label: "Propose fix", kind: "approve" },
            { id: "ignore", label: "Leave it", kind: "ignore" },
          ]
        : undefined,
    });
  }

  // ——— PREP ———
  if (/prep|what should we (prep|make)|covers tomorrow/i.test(text)) {
    const r = toolGetPrepForecast(ctx);
    tools.push(r.call);
    sources.push(r.source);
    if (r.needsConnection) {
      return connectionTurn(
        ctx,
        "I don't have enough sales data for a reliable prep plan yet.\n\nConnect your POS and I'll use historical item sales automatically. I won't invent quantities.",
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
      );
    }
  }

  // ——— WASTE ———
  if (/waste|how much.*(throw|waste)|wasted yesterday/i.test(text)) {
    const r = toolGetMeasuredWaste(ctx);
    tools.push(r.call);
    sources.push(r.source);
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: "NEEDS_CONNECTION",
      message:
        "Waste Eye isn't installed at this location, so I don't have measured food waste.\n\nI can show waste-risk estimates from Prep when POS is connected, but I won't call those measured waste.",
      sources,
      toolCalls: tools,
      grounded: true,
      actions: [
        { id: "open-kitchen", label: "View prep estimates", kind: "connect" },
      ],
      meta: { genericFallbackBlocked: true },
    });
  }

  // ——— BOOKINGS ———
  if (/booking|reservation|covers tomorrow|how many.*(book|reserv)/i.test(text)) {
    const r = toolGetReservations(ctx);
    tools.push(r.call);
    sources.push(r.source);
    if (r.needsConnection) {
      return connectionTurn(
        ctx,
        "Last reservation sync: never — bookings aren't connected.\n\nConnect OpenTable / Resy / SevenRooms and I'll answer from live covers.",
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
      );
    }
  }

  // ——— ACTION CIRCUIT BREAKER (catch remaining action verbs) ———
  if (isActionRequest(intent, text) || requiresRestaurantGrounding(intent, text)) {
    if (requiresRestaurantGrounding(intent, text) && !tools.some((t) => t.status === "ok")) {
      // Operational but we didn't match a domain tool — still forbid generic LLM
      return turn({
        restaurantId: ctx.restaurant.id,
        intent,
        type: isActionRequest(intent, text) ? "UNSUPPORTED" : "NEEDS_CONNECTION",
        message: isActionRequest(intent, text)
          ? "I won't pretend I did that. Tell me which system — Google hours, reviews, invoices, or prep — and I'll either propose a real action or say exactly what's missing."
          : "I need a connected source for that restaurant fact. Open Kitchen and connect Google, website, or invoices — I won't fill the gap with general advice.",
        sources,
        toolCalls: tools.length
          ? tools
          : [{ name: "grounding_gate", status: "skipped", detail: "blocked generic fallback" }],
        grounded: true,
        actions: [{ id: "open-kitchen", label: "Open kitchen", kind: "connect" }],
        meta: { genericFallbackBlocked: true, actionVerbDetected: isActionRequest(intent, text) },
      });
    }
  }

  // ——— GENERAL (definitions only) ———
  if (intent === "GENERAL") {
    return turn({
      restaurantId: ctx.restaurant.id,
      intent,
      type: "ANSWER",
      message: generalAnswer(text),
      sources: [],
      toolCalls: [],
      grounded: true,
      confidence: 0.7,
    });
  }

  return turn({
    restaurantId: ctx.restaurant.id,
    intent: "UNSUPPORTED",
    type: "UNSUPPORTED",
    message:
      "I can help with hours, reviews, invoices, prep (when POS is on), and house rules. Ask me about this restaurant — or say what to change.",
    sources: [],
    toolCalls: [],
    grounded: true,
  });
}

function generalAnswer(text: string): string {
  if (/gross margin|gp\b/i.test(text)) {
    return "Gross margin is sales minus cost of goods, as a share of sales. Ask about YOUR margin last week only after till and invoices are connected — I won't invent a number.";
  }
  if (/food cost/i.test(text)) {
    return "Food cost is what you spent on ingredients versus what you sold. For YOUR restaurant last week I need POS + invoices — otherwise I'll say I can't calculate it yet.";
  }
  return "Ask me about this restaurant's hours, reviews, costs, or prep — or give me a job to propose.";
}

/** Map KobTurn into Talk chat message fields. */
export function turnToChatMessage(t: KobTurn): {
  role: "kob" | "done"
  text: string
  actions?: { id: string; label: string; kind: "approve" | "yes" | "ignore" }[]
} {
  const actions = t.actions
    ?.filter((a) => a.kind === "approve" || a.kind === "yes" || a.kind === "ignore")
    .map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.kind as "approve" | "yes" | "ignore",
    }));
  let text = t.message;
  if (t.cards?.length) {
    text +=
      "\n\n" +
      t.cards.map((c) => `${c.title}\n${c.body}`).join("\n\n");
  }
  if (t.toolCalls.some((c) => c.status === "ok" || c.status === "skipped")) {
    const progress = t.toolCalls
      .map((c) => {
        if (c.status === "ok") return `✓ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`;
        if (c.status === "skipped") return `· ${c.name} — ${c.detail ?? "not connected"}`;
        return `· ${c.name}`;
      })
      .join("\n");
    text = `${progress}\n\n${text}`;
  }
  return {
    role: t.type === "ACTION_RESULT" ? "done" : "kob",
    text,
    actions: actions?.length ? actions : undefined,
  };
}

export type { KobTurn, KobTurnType };
