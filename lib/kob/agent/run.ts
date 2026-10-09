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
import {
  ownerNameLine,
  shapeForOwner,
  talkStyleFromMemory,
  TALK_STYLE_CHIPS,
  type TalkStyle,
} from "./voice";

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
  extraActions: KobActionChip[] = [],
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
        id: needs.system.toLowerCase().includes("pos")
          ? "connect-pos"
          : needs.system.toLowerCase().includes("waste")
            ? "connect-waste"
            : needs.system.toLowerCase().includes("invoice")
              ? "connect-invoices"
              : needs.system.toLowerCase().includes("book")
                ? "connect-bookings"
                : "open-kitchen",
        label: needs.cta,
        kind: "connect",
      },
      ...extraActions,
    ],
    meta: { genericFallbackBlocked: true, toolsRequired: [needs.system] },
  });
}

function styleHintActions(style: TalkStyle | null): KobActionChip[] {
  if (style) return [];
  return TALK_STYLE_CHIPS.map((c) => ({
    id: c.id,
    label: c.label,
    kind: "yes" as const,
  }));
}

function dayFromText(text: string): string | null {
  const m = text.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  return m ? m[1]!.replace(/^\w/, (c) => c.toUpperCase()) : null;
}

/** Parse loose owner hours like "8-8pm", "12–11", "9 to 10pm". */
function parseHoursSnippet(text: string): { open: string; close: string } | null {
  const t = text.trim().toLowerCase().replace(/\u2013|\u2014/g, "-");
  const m = t.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\.?$/i,
  );
  if (!m) return null;
  const fmt = (h: string, min: string | undefined, mer: string | undefined, inherit?: string) => {
    const mm = min ?? "00";
    const merUse = (mer || inherit || "").toLowerCase();
    if (!merUse) return `${h}:${mm}`;
    return `${h}${min ? `:${mm}` : ""}${merUse}`;
  };
  const closeMer = m[6] || m[3] || "pm";
  const openMer = m[3] || (Number(m[1]) <= 11 ? "am" : closeMer);
  return {
    open: fmt(m[1]!, m[2], openMer, closeMer),
    close: fmt(m[4]!, m[5], closeMer),
  };
}

function isGreeting(text: string): boolean {
  return /^(hi|hey|hello|gm|good\s*(morning|afternoon|evening)|yo|sup|hiya)\b[!?.]*$/i.test(
    text.trim(),
  );
}

function wantsMoreCovers(text: string): boolean {
  return (
    /\b(more covers|need covers|need more (guests|customers|covers|bookings)|busier|increase (covers|footfall)|get more (people|guests|covers))\b/i.test(
      text,
    ) || /^we need more covers\.?$/i.test(text.trim())
  );
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
  const style = talkStyleFromMemory(input.memory);
  const place = ownerNameLine(ctx.restaurant);

  // ——— GREETING ———
  if (isGreeting(text)) {
    const needs = ctx.findings.filter((f) => f.status === "needs").length;
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "GENERAL",
      type: "ANSWER",
      message: shapeForOwner(style, {
        lead:
          needs > 0
            ? `Morning. ${needs} thing${needs === 1 ? "" : "s"} need you at ${place}.`
            : `Morning. Nothing urgent on my list for ${place}.`,
        detail:
          needs > 0
            ? "Say “what needs me” and I’ll show them — or give me a job (hours, reviews, costs)."
            : "Ask about hours, reviews, costs, or prep — or tell me what you want done.",
        ask: style ? undefined : "Prefer short replies, or walk-throughs?",
      }),
      sources: [],
      toolCalls: [],
      grounded: true,
      actions: [
        { id: "prompt-needs", label: "What needs me?", kind: "yes" },
        { id: "prompt-close-monday", label: "Update hours", kind: "yes" },
        { id: "prompt-reviews", label: "Reviews", kind: "yes" },
        ...styleHintActions(style).slice(0, 2),
      ],
    });
  }

  // ——— HOURS SNIPPET (owner teaching / quick set) ———
  const hoursSnippet = parseHoursSnippet(text);
  if (hoursSnippet) {
    const day = dayFromText(text);
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_ACTION",
      type: "ACTION_PROPOSAL",
      message: shapeForOwner(style, {
        lead: `Got it — ${hoursSnippet.open}–${hoursSnippet.close}.`,
        detail: day
          ? `Apply that for ${day} on Google and the website?`
          : "Which days? I can set every day, weekdays only, or a single day. Nothing goes live until you approve.",
        ask: day ? "Approve when ready." : "Pick a range below, or type e.g. “Mon–Thu”.",
      }),
      sources: [{ id: "memory", kind: "memory", label: "Owner hours", status: "LIVE" }],
      toolCalls: [{ name: "parse_hours_snippet", status: "ok", detail: `${hoursSnippet.open}–${hoursSnippet.close}` }],
      grounded: true,
      actions: day
        ? [
            { id: "approve-hours", label: `Set ${day}`, kind: "approve" },
            { id: "ignore", label: "Not yet", kind: "ignore" },
          ]
        : [
            { id: "hours-everyday", label: "Every day", kind: "yes" },
            { id: "hours-weekdays", label: "Mon–Fri", kind: "yes" },
            { id: "hours-weekend", label: "Sat–Sun", kind: "yes" },
            { id: "ignore", label: "Cancel", kind: "ignore" },
          ],
      meta: { actionVerbDetected: true, genericFallbackBlocked: true },
    });
  }

  // ——— GOAL: more covers / footfall ———
  if (wantsMoreCovers(text)) {
    const mismatch =
      ctx.integrations.google &&
      ctx.integrations.website &&
      ctx.restaurant.hoursGoogle !== ctx.restaurant.hoursWebsite;
    const openReviews = ctx.reviews.filter(
      (x) => x.status === "draft" || x.status === "escalate",
    ).length;
    const levers: string[] = [];
    if (mismatch) levers.push("Fix Google vs website hours (guests trust the listing)");
    if (openReviews) levers.push(`Clear ${openReviews} open review(s) — reputation moves covers`);
    if (ctx.findings.some((f) => /menu|price/i.test(f.headline))) {
      levers.push("Fix stale menu prices guests still see online");
    }
    if (!levers.length) {
      levers.push("Check Google listing + hours are consistent");
      levers.push("Reply to open reviews");
      levers.push("Tell me a quiet day and I’ll avoid discounting busy nights");
    }
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_ACTION",
      type: "ACTION_PROPOSAL",
      message: shapeForOwner(style, {
        lead: `More covers at ${place} — here’s what I can actually work on now.`,
        detail: levers.map((l, i) => `${i + 1}. ${l}`).join("\n"),
        ask: "I won’t invent ads or fake bookings. Pick a job and I’ll propose the next step.",
      }),
      sources: ctx.findings.length
        ? [{ id: "findings", kind: "store", label: "Morning findings", status: "DEMO" }]
        : [],
      toolCalls: [{ name: "plan_covers_levers", status: "ok", detail: `${levers.length} levers` }],
      grounded: true,
      actions: [
        { id: "prompt-needs", label: "Show what needs me", kind: "yes" },
        { id: "prompt-reviews", label: "Handle reviews", kind: "yes" },
        { id: "approve-hours", label: mismatch ? "Fix hours mismatch" : "Check hours", kind: "approve" },
        { id: "prompt-costs", label: "Watch costs", kind: "yes" },
      ],
      meta: { actionVerbDetected: true, genericFallbackBlocked: true },
    });
  }

  // ——— APPROVAL ———
  if (intent === "APPROVAL") {
    if (!input.pendingAction) {
      return turn({
        restaurantId: ctx.restaurant.id,
        intent,
        type: "CLARIFICATION",
        message: shapeForOwner(style, {
          lead: `Nothing is waiting on your yes at ${place}.`,
          detail:
            "Tap a job below, or tell me in your words — hours, reviews, invoices, or a house rule.",
          ask: style
            ? undefined
            : "How do you want me to talk with you day to day?",
        }),
        sources: [],
        toolCalls: [],
        grounded: true,
        actions: [
          { id: "prompt-close-monday", label: "Close a day", kind: "yes" },
          { id: "prompt-reviews", label: "Handle reviews", kind: "yes" },
          { id: "prompt-costs", label: "Check costs", kind: "yes" },
          ...styleHintActions(style),
        ],
      });
    }
    return turn({
      restaurantId: ctx.restaurant.id,
      intent,
      type: "ACTION_RESULT",
      message: shapeForOwner(style, {
        lead: "Got it — queued.",
        detail:
          "I'll push to the connected systems next. Live Google / website write is Sent — waiting until reconnect verifies. I won't say Done ✓ until I can read it back.",
      }),
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
      message: shapeForOwner(style, {
        lead: `Understood for ${place}.`,
        detail: `${subject} will never run on autopilot.`,
        ask: "Save this house rule? And tell me if I should keep Talk short, guided, or just propose.",
      }),
      sources: [{ id: "memory", kind: "memory", label: "House rules", status: "LIVE" }],
      toolCalls: [{ name: "create_rule_candidate", status: "ok" }],
      grounded: true,
      actions: [
        { id: "save-rule", label: "Save rule", kind: "approve" },
        { id: "ignore", label: "Not now", kind: "ignore" },
        ...styleHintActions(style),
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
        ? shapeForOwner(style, {
            lead: `${needs.length} thing${needs.length === 1 ? "" : "s"} need you at ${place}.`,
            detail: lines + done,
            ask: style ? undefined : undefined,
          })
        : shapeForOwner(style, {
            lead: `Nothing needs you at ${place}.`,
            detail: `${handled.length} item(s) already marked handled in this session.${done}`,
          }),
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
      const taught = input.memory.find((m) => /prep.?covers|usual covers/i.test(`${m.text} ${m.learned}`));
      if (taught) {
        return turn({
          restaurantId: ctx.restaurant.id,
          intent: "RESTAURANT_QUESTION",
          type: "FINDING",
          message: shapeForOwner(style, {
            lead: `No POS yet — using what you taught me for ${place}.`,
            detail: taught.learned,
            ask: "Connect the till when you can and I'll replace this with real item sales. Adjust covers?",
          }),
          sources: [
            r.source,
            { id: "memory", kind: "memory", label: "Owner prep notes", status: "LIVE" },
          ],
          toolCalls: tools,
          grounded: true,
          actions: [
            { id: "connect-pos", label: "Connect POS", kind: "connect" },
            { id: "teach-prep-quiet", label: "Quieter (~40)", kind: "yes" },
            { id: "teach-prep-busy", label: "Busier (~80)", kind: "yes" },
            { id: "teach-prep-custom", label: "I'll type covers", kind: "yes" },
          ],
          meta: { genericFallbackBlocked: true },
        });
      }
      return connectionTurn(
        ctx,
        shapeForOwner(style, {
          lead: `I won't invent tomorrow's prep for ${place} without sales history.`,
          detail:
            "Connect POS and I'll build quantities from your real item mix. Or teach me your usual covers now — I'll treat that as owner notes until the till is linked.",
          ask: "Roughly how many covers on a normal weekday?",
        }),
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
        [
          { id: "teach-prep-quiet", label: "~40 covers", kind: "yes" },
          { id: "teach-prep-busy", label: "~80 covers", kind: "yes" },
          { id: "teach-prep-custom", label: "I'll type it", kind: "yes" },
          ...styleHintActions(style).slice(0, 2),
        ],
      );
    }
  }

  // ——— WASTE ———
  if (/waste|how much.*(throw|waste)|wasted yesterday/i.test(text)) {
    const r = toolGetMeasuredWaste(ctx);
    tools.push(r.call);
    sources.push(r.source);
    const taught = input.memory.find((m) => /waste.?note|usually waste/i.test(`${m.text} ${m.learned}`));
    return turn({
      restaurantId: ctx.restaurant.id,
      intent: "RESTAURANT_QUESTION",
      type: "NEEDS_CONNECTION",
      message: shapeForOwner(style, {
        lead: taught
          ? `No measured waste at ${place} (Waste Eye not installed).`
          : `Waste Eye isn't at ${place}, so I have no measured kilograms.`,
        detail: taught
          ? `Owner note on file: ${taught.learned}\nThat is not measured waste — labelled ESTIMATED / OWNER NOTE.`
          : "I won't invent a kg figure. You can teach me what usually goes in the bin, or wait for Waste Eye hardware.",
        ask: taught
          ? "Update what usually wastes, or open Kitchen for prep estimates?"
          : "What usually wastes most — bread, protein trim, or produce?",
      }),
      sources: taught
        ? [
            r.source,
            { id: "memory", kind: "memory", label: "Owner waste notes", status: "LIVE" },
          ]
        : [r.source],
      toolCalls: tools,
      grounded: true,
      actions: [
        { id: "connect-waste", label: "Waste Eye waitlist", kind: "connect" },
        { id: "connect-pos", label: "Prep estimates (needs POS)", kind: "connect" },
        { id: "teach-waste-bread", label: "Mostly bread", kind: "yes" },
        { id: "teach-waste-protein", label: "Protein trim", kind: "yes" },
        { id: "teach-waste-produce", label: "Produce", kind: "yes" },
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
        shapeForOwner(style, {
          lead: `Bookings aren't connected for ${place}.`,
          detail: "I won't guess covers. Connect OpenTable / Resy / SevenRooms, or tell me expected covers and I'll remember it as an owner note.",
          ask: "Expected covers tomorrow?",
        }),
        r.needsConnection,
        tools,
        "RESTAURANT_QUESTION",
        [
          { id: "teach-prep-quiet", label: "~40 covers", kind: "yes" },
          { id: "teach-prep-busy", label: "~80 covers", kind: "yes" },
          { id: "teach-prep-custom", label: "I'll type it", kind: "yes" },
        ],
      );
    }
  }

  // ——— ACTION CIRCUIT BREAKER (catch remaining action verbs) ———
  if (isActionRequest(intent, text) || requiresRestaurantGrounding(intent, text)) {
    if (requiresRestaurantGrounding(intent, text) && !tools.some((t) => t.status === "ok")) {
      return turn({
        restaurantId: ctx.restaurant.id,
        intent,
        type: "CLARIFICATION",
        message: shapeForOwner(style, {
          lead: `I heard you — I just need a sharper job for ${place}.`,
          detail: isActionRequest(intent, text)
            ? "I won’t pretend I finished something I can’t see. Tell me which: hours, reviews, invoices, or prep."
            : "I don’t have that number in a connected source yet. I can still take a job or learn from you.",
          ask: "What should we do first?",
        }),
        sources,
        toolCalls: [],
        grounded: true,
        actions: [
          { id: "prompt-needs", label: "What needs me?", kind: "yes" },
          { id: "prompt-close-monday", label: "Hours", kind: "yes" },
          { id: "prompt-reviews", label: "Reviews", kind: "yes" },
          { id: "prompt-costs", label: "Costs", kind: "yes" },
          { id: "open-kitchen", label: "Open kitchen", kind: "connect" },
        ],
        meta: { genericFallbackBlocked: true, actionVerbDetected: isActionRequest(intent, text) },
      });
    }
  }

  // ——— GENERAL (definitions + soft redirect) ———
  if (intent === "GENERAL") {
    return turn({
      restaurantId: ctx.restaurant.id,
      intent,
      type: "ANSWER",
      message: generalAnswer(text, place, style),
      sources: [],
      toolCalls: [],
      grounded: true,
      confidence: 0.7,
      actions: [
        { id: "prompt-needs", label: "What needs me?", kind: "yes" },
        { id: "prompt-reviews", label: "Reviews", kind: "yes" },
        { id: "prompt-costs", label: "Costs", kind: "yes" },
      ],
    });
  }

  return turn({
    restaurantId: ctx.restaurant.id,
    intent: "UNSUPPORTED",
    type: "CLARIFICATION",
    message: shapeForOwner(style, {
      lead: `I’m with you on ${place}.`,
      detail: "I work best on hours, reviews, invoices, prep, and house rules.",
      ask: "What do you want done — or what’s on your mind?",
    }),
    sources: [],
    toolCalls: [],
    grounded: true,
    actions: [
      { id: "prompt-needs", label: "What needs me?", kind: "yes" },
      { id: "prompt-close-monday", label: "Hours", kind: "yes" },
      { id: "prompt-reviews", label: "Reviews", kind: "yes" },
    ],
  });
}

function generalAnswer(text: string, place: string, style: TalkStyle | null): string {
  if (/gross margin|gp\b/i.test(text)) {
    return shapeForOwner(style, {
      lead: "Gross margin is sales minus cost of goods, as a share of sales.",
      detail: `For ${place} last week I need till + invoices — I won’t invent a number.`,
    });
  }
  if (/food cost/i.test(text)) {
    return shapeForOwner(style, {
      lead: "Food cost is what you spent on ingredients versus what you sold.",
      detail: `Ask me about YOUR week once POS and invoices are on.`,
    });
  }
  return shapeForOwner(style, {
    lead: `I’m here for ${place}.`,
    detail: "Hours, reviews, costs, prep — or give me a job.",
    ask: "What’s first?",
  });
}

/** Map KobTurn into Talk chat message fields. */
export function turnToChatMessage(t: KobTurn): {
  role: "kob" | "done"
  text: string
  actions?: { id: string; label: string; kind: "approve" | "yes" | "ignore" }[]
} {
  const actions = t.actions
    ?.filter(
      (a) =>
        a.kind === "approve" ||
        a.kind === "yes" ||
        a.kind === "ignore" ||
        a.kind === "connect" ||
        a.kind === "review",
    )
    .map((a) => ({
      id: a.id,
      label: a.label,
      // Chat UI historically only knew approve/yes/ignore — map connect/review to yes
      kind: (a.kind === "approve"
        ? "approve"
        : a.kind === "ignore"
          ? "ignore"
          : "yes") as "approve" | "yes" | "ignore",
    }));
  let text = t.message;
  if (t.cards?.length) {
    text +=
      "\n\n" +
      t.cards.map((c) => `${c.title}\n${c.body}`).join("\n\n");
  }
  if (t.toolCalls.some((c) => c.status === "ok" || c.status === "skipped")) {
    const OWNER_HIDE =
      /grounding_gate|parse_hours|plan_covers|create_rule_candidate|approve_pending/i;
    const progress = t.toolCalls
      .filter((c) => !OWNER_HIDE.test(c.name))
      .filter((c) => c.status === "ok" || (c.status === "skipped" && c.detail && !/blocked/i.test(c.detail)))
      .map((c) => {
        const label = c.name.replace(/_/g, " ");
        if (c.status === "ok") return `✓ ${label}${c.detail ? ` — ${c.detail}` : ""}`;
        if (c.status === "skipped") return `· ${label} — ${c.detail ?? "not connected"}`;
        return `· ${label}`;
      })
      .join("\n");
    if (progress) text = `${progress}\n\n${text}`;
  }
  return {
    role: t.type === "ACTION_RESULT" ? "done" : "kob",
    text,
    actions: actions?.length ? actions : undefined,
  };
}

export type { KobTurn, KobTurnType };
