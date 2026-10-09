"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KitchenSheet } from "@/components/kob-app/kitchen-sheet";
import { WaBubble, WaWorking } from "@/components/kob-chat/wa-thread";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { KobWordmark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { VoicePill } from "@/components/kob-micro";
import { runKobTurn, turnToChatMessage } from "@/lib/kob/agent";
import { actOnTalk } from "@/lib/kob/act";
import { DEMO_RESTAURANTS, type ChatMessage } from "@/lib/kob/demo";
import {
  parseInvoice,
  reviewVelocity,
  weatherPrep,
} from "@/lib/kob/engines/server";
import { priceAlerts } from "@/lib/kob/engines/prices";
import {
  QUESTIONS,
  RULE_CHOICES,
  isOverridden,
  nextUnanswered,
  parseRuleAnswer,
  looksLikeRuleAnswer,
  priceTightness,
  repliesOnAutopilot,
  rulesComplete,
  type RuleId,
} from "@/lib/kob/house-rules";
import { useKobStore } from "@/lib/kob/store";

const subscribeToHydration = () => () => {};

export default function WorkspacePage() {
  const restaurant = useKobStore((s) => s.restaurant);
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);
  const replayMorning = useKobStore((s) => s.replayMorning);
  const houseRules = useKobStore((s) => s.houseRules);
  const messages = useKobStore((s) => s.messages);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!restaurant) hydrateRestaurant(DEMO_RESTAURANTS[0]);
    else if (
      !rulesComplete(houseRules) &&
      !messages.some((m) => m.id.startsWith("setup"))
    ) {
      replayMorning();
    }
  }, [houseRules, hydrateRestaurant, messages, replayMorning, restaurant]);

  if (!ready || !restaurant) return null;

  return (
    <>
      <div className="border-b border-line bg-cream px-4 py-3 text-sm text-espresso">
        Example workspace · sample data, no live account actions.{" "}
        <Link href="/app" className="underline">
          Open your workspace
        </Link>
      </div>
      <Workspace />
    </>
  );
}

function Workspace() {
  const restaurant = useKobStore((s) => s.restaurant)!;
  const setSheetOpen = useKobStore((s) => s.setSheetOpen);
  const orbMode = useKobStore((s) => s.orbMode);
  const houseRules = useKobStore((s) => s.houseRules);
  const findings = useKobStore((s) => s.findings);
  const needs = findings.filter((f) => f.status === "needs").length;
  const handled = findings.filter((f) => f.status === "done").length;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#ecece9]">
      <header className="flex h-14 items-center gap-3 border-b border-line bg-paper px-4">
        <Link href="/" aria-label="KOB home">
          <KobWordmark />
        </Link>
        <GreenOrb
          size="sm"
          mode={orbMode}
          tightness={priceTightness(houseRules)}
          soft={repliesOnAutopilot(houseRules)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-espresso">
            {restaurant.name}
          </p>
          <p className="text-[0.7rem] text-muted">
            {needs ? `${needs} need you` : "Nothing needs you"}
            {handled ? ` · ${handled} handled` : ""}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-espresso px-3 py-1.5 text-sm text-paper"
          onClick={() => setSheetOpen(true)}
        >
          Open kitchen
        </button>
      </header>
      <KobChat />
      <KitchenSheet />
    </div>
  );
}

function KobChat() {
  const restaurant = useKobStore((s) => s.restaurant)!;
  const messages = useKobStore((s) => s.messages);
  const addMessage = useKobStore((s) => s.addMessage);
  const approve = useKobStore((s) => s.approve);
  const applyWork = useKobStore((s) => s.applyWork);
  const memory = useKobStore((s) => s.memory);
  const findings = useKobStore((s) => s.findings);
  const reviews = useKobStore((s) => s.reviews);
  const approvedIds = useKobStore((s) => s.approvedIds);
  const autonomy = useKobStore((s) => s.autonomy);
  const houseRules = useKobStore((s) => s.houseRules);
  const setHouseRule = useKobStore((s) => s.setHouseRule);
  const connected = useKobStore((s) => s.connected);
  const connectTool = useKobStore((s) => s.connectTool);
  const remember = useKobStore((s) => s.remember);
  const overrides = useKobStore((s) => s.overrides);
  const overrideToday = useKobStore((s) => s.overrideToday);
  const setOrbMode = useKobStore((s) => s.setOrbMode);
  const setHolding = useKobStore((s) => s.setHolding);
  const setSheetOpen = useKobStore((s) => s.setSheetOpen);
  const weatherCity = useKobStore((s) => s.weatherCity);
  const pendingClosureDate = useKobStore((s) => s.pendingClosureDate);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) {
      const waiting = messages.some(
        (m) => m.actions && !approvedIds.includes(m.id),
      );
      setOrbMode(waiting ? "alert" : "idle");
    }
  }, [approvedIds, busy, messages, setOrbMode]);

  async function runDemoInvoice() {
    connectTool("accounting");
    setOrbMode("thinking");
    setBusy(true);
    const result = await parseInvoice({ data: {} });
    setBusy(false);
    if (!result.ok) {
      addMessage({
        id: `k-${Date.now()}`,
        role: "kob",
        text: "Could not read the note. Try again.",
      });
      setOrbMode("idle");
      return;
    }
    const lines = result.lines;
    const alerts = priceAlerts(lines).filter((a) => {
      if (isOverridden(overrides, "invoice")) return true;
      const cap = houseRules.invoice.flagPct;
      if (cap != null && cap > 0 && a.abovePct < cap) return false;
      return true;
    });
    setHolding(
      alerts.map((a) => ({
        id: `p-${a.item}`,
        text: `${a.item} is ${a.abovePct}% above the price I last read.`,
      })),
    );
    const text = [
      result.note,
      alerts.length
        ? alerts.map((a) => a.note).join("\n\n")
        : "No line is above your flag. Nothing to chase.",
    ]
      .filter(Boolean)
      .join("\n\n");
    addMessage({
      id: `k-${Date.now()}`,
      role: "kob",
      text,
      actions: [
        { id: "approve-all", label: "Draft supplier note", kind: "approve" },
        { id: "ignore", label: "Leave it", kind: "ignore" },
        { id: "override-invoice", label: "Override today", kind: "yes" },
      ],
      doneText:
        "Draft only.\nSupplier note queued. Not sent.\nI'll keep watching.",
    });
    setOrbMode("alert");
  }

  async function runWeather() {
    setOrbMode("thinking");
    setBusy(true);
    const result = await weatherPrep({ data: { city: weatherCity } });
    setBusy(false);
    if (result.ok) {
      setHolding([{ id: "weather", text: result.note.slice(0, 120) }]);
      addMessage({
        id: `k-${Date.now()}`,
        role: "kob",
        text: result.note,
        actions: [
          { id: "approve-all", label: "Tell the kitchen", kind: "approve" },
          { id: "ignore", label: "Leave it", kind: "ignore" },
        ],
        doneText:
          "Draft only.\nPrep note queued. Not sent.\nI'll keep watching.",
      });
      setOrbMode("alert");
    }
  }

  async function runNearbyReviews() {
    setOrbMode("thinking");
    setBusy(true);
    const place = restaurant?.name || "restaurant";
    const city = weatherCity || "Cape Town";
    const result = await reviewVelocity({
      data: { query: `${place} ${city}` },
    });
    setBusy(false);
    if (result.ok) {
      setHolding([{ id: "google", text: result.note.slice(0, 120) }]);
      addMessage({
        id: `k-${Date.now()}`,
        role: "kob",
        text: result.note,
        actions: [
          { id: "approve-all", label: "Draft a reply plan", kind: "approve" },
          { id: "ignore", label: "Leave it", kind: "ignore" },
        ],
        doneText:
          "Sent — waiting for confirmation.\nReview watch queued.\nI'll keep watching.",
      });
      setOrbMode("alert");
    }
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    const ownerMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "owner",
      text,
    };
    addMessage(ownerMsg);
    setInput("");

    const unanswered = nextUnanswered(houseRules);
    if (unanswered && looksLikeRuleAnswer(unanswered, text)) {
      applyRuleAnswer(unanswered, text);
      return;
    }

    const coversMatch = text.match(/^~?\s*(\d{1,3})\s*(covers?)?$/i);
    if (coversMatch) {
      const covers = Number(coversMatch[1]);
      remember({
        id: `mem-prep-${Date.now()}`,
        text: "prep covers",
        learned: `Usual weekday covers ~${covers} (owner note — not POS).`,
      });
      addMessage({
        id: `prep-${Date.now()}`,
        role: "done",
        text: `Saved ~${covers} covers as an owner note. Ask “what should we prep tomorrow?” and I’ll use it until POS is connected.`,
      });
      setOrbMode("done");
      return;
    }

    setOrbMode("thinking");
    setBusy(true);

    // Operator agent first — never LLM for grounded restaurant work
    const kobTurn = await runKobTurn({
      text,
      restaurant,
      connected,
      autonomy,
      houseRules,
      memory,
      findings,
      reviews,
    });

    if (kobTurn.grounded && kobTurn.type !== "UNSUPPORTED") {
      const mapped = turnToChatMessage(kobTurn);
      let reply = mapped.text;
      let actions = mapped.actions ?? [];

      if (unanswered && !looksLikeRuleAnswer(unanswered, text)) {
        reply = `${reply}\n\nStill need this house rule: ${QUESTIONS[unanswered].ask}`;
        const ruleButtons = RULE_CHOICES[unanswered].map((choice) => ({
          id: choice.id,
          label: choice.label,
          kind: "yes" as const,
        }));
        actions = [...ruleButtons, ...actions];
      }

      addMessage({
        id: `k-${Date.now()}`,
        role: mapped.role,
        text: reply,
        actions: actions.length ? actions : undefined,
      });
      setBusy(false);
      setOrbMode(actions.length ? "alert" : "idle");
      return;
    }

    // Narrow legacy path for demo engines still wired to buttons (invoice/weather)
    const acted = await actOnTalk({
      text,
      restaurant,
      findings,
      reviews,
      autonomy,
      memory,
      connected,
      houseRules,
      overrides,
      pendingClosureDate,
    });
    applyWork(acted.mutations);

    // Circuit breaker: never use generic chat LLM for operational leftovers
    let reply = acted.reply;
    if (acted.kind === "chat") {
      reply =
        "I won't invent an answer for that. Ask about hours, reviews, invoices, prep, or waste — or open Kitchen to connect what's missing.";
    }

    const jobActions = acted.actions ?? [];
    let actions = jobActions;
    let doneText = acted.doneText;

    if (unanswered && !looksLikeRuleAnswer(unanswered, text)) {
      reply = `${reply}\n\nStill need this house rule: ${QUESTIONS[unanswered].ask}`;
      const ruleButtons = RULE_CHOICES[unanswered].map((choice) => ({
        id: choice.id,
        label: choice.label,
        kind: "yes" as const,
      }));
      actions = [...ruleButtons, ...jobActions];
      doneText = acted.doneText;
    }

    addMessage({
      id: `k-${Date.now()}`,
      role: /^(Done|Sent —|Draft only)/.test(reply) ? "done" : "kob",
      text: reply,
      actions: actions.length ? actions : undefined,
      doneText,
    });
    setBusy(false);
    setOrbMode(actions.length ? "alert" : "idle");
  }

  function applyRuleAnswer(id: RuleId, text: string) {
    const parsed = parseRuleAnswer(id, text);
    setHouseRule(id, parsed);
    const next = nextUnanswered({ ...houseRules, [id]: parsed });
    if (next) {
      addMessage({
        id: `setup-${next}-${Date.now()}`,
        role: "kob",
        text: `Logged.\n\n${QUESTIONS[next].ask}`,
        actions: RULE_CHOICES[next].map((choice) => ({
          id: choice.id,
          label: choice.label,
          kind: "yes" as const,
        })),
      });
    } else {
      addMessage({
        id: `setup-done-${Date.now()}`,
        role: "done",
        text: "House rules are in. Jobs still wait for your yes.",
      });
    }
    setOrbMode(next ? "alert" : "done");
  }

  function onAction(id: string, actionId: string) {
    if (
      actionId === "open-kitchen" ||
      actionId === "connect-pos" ||
      actionId === "connect-waste" ||
      actionId === "connect-invoices" ||
      actionId === "connect-bookings"
    ) {
      approve(id, { complete: false });
      if (actionId === "connect-invoices") connectTool("accounting");
      if (actionId === "connect-pos") {
        addMessage({
          id: `pos-${Date.now()}`,
          role: "kob",
          text: "POS partner login is Coming soon. I'll keep using any covers you teach me until then. Open Kitchen to see what's live today.",
        });
      }
      if (actionId === "connect-waste") {
        addMessage({
          id: `waste-${Date.now()}`,
          role: "kob",
          text: "Waste Eye is Coming next (camera + scale). Until then, teach me what usually wastes — I'll label it OWNER NOTE, never measured kg.",
        });
      }
      if (actionId === "connect-bookings") {
        addMessage({
          id: `book-${Date.now()}`,
          role: "kob",
          text: "Reservations connect is Coming next. Tell me expected covers and I'll remember them as owner notes.",
        });
      }
      setSheetOpen(true);
      return;
    }
    if (actionId === "talk-style-short") {
      approve(id, { complete: false });
      remember({
        id: `mem-talk-${Date.now()}`,
        text: "talk-style: short",
        learned: "Owner wants short replies.",
      });
      addMessage({
        id: `ts-${Date.now()}`,
        role: "done",
        text: "Got it. I'll keep Talk short.",
      });
      return;
    }
    if (actionId === "talk-style-guided") {
      approve(id, { complete: false });
      remember({
        id: `mem-talk-${Date.now()}`,
        text: "talk-style: guided",
        learned: "Owner wants guided walkthroughs.",
      });
      addMessage({
        id: `ts-${Date.now()}`,
        role: "done",
        text: "Got it. I'll walk you through steps.",
      });
      return;
    }
    if (actionId === "talk-style-propose") {
      approve(id, { complete: false });
      remember({
        id: `mem-talk-${Date.now()}`,
        text: "talk-style: propose",
        learned: "Owner wants proposals then approve.",
      });
      addMessage({
        id: `ts-${Date.now()}`,
        role: "done",
        text: "Got it. I'll propose — you approve.",
      });
      return;
    }
    if (actionId === "teach-prep-quiet" || actionId === "teach-prep-busy") {
      const covers = actionId === "teach-prep-quiet" ? 40 : 80;
      approve(id, { complete: false });
      remember({
        id: `mem-prep-${Date.now()}`,
        text: "prep covers",
        learned: `Usual weekday covers ~${covers} (owner note — not POS). Scale pastry/focaccia down on quieter days.`,
      });
      addMessage({
        id: `u-prep-${Date.now()}`,
        role: "owner",
        text: `About ${covers} covers`,
      });
      addMessage({
        id: `prep-${Date.now()}`,
        role: "done",
        text: `Saved. Until POS is connected I'll plan around ~${covers} covers as an owner note — not measured sales. Ask prep again anytime.`,
      });
      return;
    }
    if (actionId === "teach-prep-custom") {
      approve(id, { complete: false });
      addMessage({
        id: `prep-ask-${Date.now()}`,
        role: "kob",
        text: "Type the covers (e.g. 65) and I'll save it as your usual day.",
      });
      return;
    }
    if (
      actionId === "teach-waste-bread" ||
      actionId === "teach-waste-protein" ||
      actionId === "teach-waste-produce"
    ) {
      const what =
        actionId === "teach-waste-bread"
          ? "bread / pastry"
          : actionId === "teach-waste-protein"
            ? "protein trim"
            : "produce";
      approve(id, { complete: false });
      remember({
        id: `mem-waste-${Date.now()}`,
        text: "waste note",
        learned: `Usually waste most: ${what}. ESTIMATED / OWNER NOTE — not measured Waste Eye kg.`,
      });
      addMessage({
        id: `u-waste-${Date.now()}`,
        role: "owner",
        text: what,
      });
      addMessage({
        id: `waste-ok-${Date.now()}`,
        role: "done",
        text: `Saved as owner note: ${what} tends to waste most. I will never call that measured waste.`,
      });
      return;
    }
    if (actionId === "prompt-close-monday") {
      approve(id, { complete: false });
      void send("We're closed Monday.");
      return;
    }
    if (actionId === "prompt-reviews") {
      approve(id, { complete: false });
      void send("Reply to today's reviews.");
      return;
    }
    if (actionId === "prompt-costs") {
      approve(id, { complete: false });
      void send("Did any supplier prices rise?");
      return;
    }
    if (actionId === "prompt-needs") {
      approve(id, { complete: false });
      void send("What needs my attention today?");
      return;
    }
    if (actionId === "hours-everyday" || actionId === "hours-weekdays" || actionId === "hours-weekend") {
      const range =
        actionId === "hours-everyday"
          ? "every day"
          : actionId === "hours-weekdays"
            ? "Monday to Friday"
            : "Saturday and Sunday";
      approve(id, { complete: false });
      remember({
        id: `mem-hours-${Date.now()}`,
        text: "opening hours",
        learned: `Owner set hours for ${range} (from Talk snippet). Awaiting Apply before public write.`,
      });
      addMessage({
        id: `hours-${Date.now()}`,
        role: "kob",
        text: `Noted for ${range}. When Google write is reconnected I'll propose Apply — nothing public until you approve and I verify.`,
        actions: [
          { id: "approve-hours", label: "Queue Apply", kind: "approve" },
          { id: "ignore", label: "Hold", kind: "ignore" },
        ],
      });
      return;
    }
    if (actionId === "save-rule") {
      approve(id, { complete: false });
      addMessage({
        id: `rule-saved-${Date.now()}`,
        role: "done",
        text: "Rule saved to house memory. I'll enforce it on future jobs.",
      });
      return;
    }
    if (actionId.startsWith("rule-")) {
      const choice = Object.values(RULE_CHOICES)
        .flat()
        .find((item) => item.id === actionId);
      const ruleId = (Object.entries(RULE_CHOICES).find(([, list]) =>
        list.some((item) => item.id === actionId),
      )?.[0] ?? nextUnanswered(houseRules)) as RuleId | null;
      if (choice && ruleId) {
        approve(id, { complete: false });
        addMessage({
          id: `u-rule-${Date.now()}`,
          role: "owner",
          text: choice.label,
        });
        applyRuleAnswer(ruleId, choice.answer);
        return;
      }
    }
    if (actionId === "demo-invoice") {
      void runDemoInvoice();
      approve(id, { complete: false });
      return;
    }
    if (actionId === "weather-prep") {
      void runWeather();
      approve(id, { complete: false });
      return;
    }
    if (actionId === "nearby-reviews") {
      void runNearbyReviews();
      approve(id, { complete: false });
      return;
    }
    if (actionId.startsWith("override-")) {
      const rule = actionId.replace("override-", "") as RuleId;
      overrideToday(rule);
      addMessage({
        id: `ov-${Date.now()}`,
        role: "done",
        text: `Override on. That house rule is off until tomorrow.`,
      });
      approve(id, { complete: false });
      return;
    }
    if (actionId === "ignore" || actionId === "review") {
      approve(id, { complete: false });
      addMessage({
        id: `leave-${Date.now()}`,
        role: "kob",
        text: "Left it. I'll keep watching. Nothing posted.",
      });
      return;
    }
    if (actionId === "approve-all") {
      approve(id, { complete: false });
      void send("apply all");
      return;
    }
    approve(id, { complete: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        className="relative flex-1 space-y-3 overflow-y-auto px-4 py-6 sm:px-8"
      >
        <span className="absolute bottom-8 left-[2.15rem] top-10 w-px bg-sage/25" />
        {messages.map((message) => (
          <WaBubble
            key={message.id}
            message={message}
            approved={approvedIds.includes(message.id)}
            onAction={onAction}
          />
        ))}
        {busy ? <WaWorking mode="thinking" /> : null}
      </div>
      <form
        className="border-t border-line bg-paper p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-cream/60 py-1 pr-1 pl-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask KOB anything about your restaurant…"
            className="h-10 min-w-0 flex-1 border-0 bg-transparent text-base text-espresso outline-none placeholder:text-muted"
            aria-label="Message KOB"
          />
          <VoicePill
            onTranscript={(text) => {
              setInput(text);
              void send(text);
            }}
            demoFallback="Why was food cost high last week?"
          />
          <Button type="submit" disabled={busy || !input.trim()} size="sm">
            Send
          </Button>
        </div>
        <button
          type="button"
          className="mt-1 w-full text-center text-xs text-muted"
          onClick={() => setSheetOpen(true)}
        >
          Open kitchen
        </button>
      </form>
    </div>
  );
}
