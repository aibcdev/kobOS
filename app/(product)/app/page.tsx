"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KitchenSheet } from "@/components/kob-app/kitchen-sheet";
import { WaBubble, WaWorking } from "@/components/kob-chat/wa-thread";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { KobWordmark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { actOnTalk } from "@/lib/kob/act";
import { talkToKob } from "@/lib/kob/ai/kob";
import { DEMO_RESTAURANTS, type ChatMessage } from "@/lib/kob/demo";
import { parseInvoice, reviewVelocity, weatherPrep } from "@/lib/kob/engines/server";
import { DEMO_POS } from "@/lib/kob/engines/kitchen-data";
import { priceAlerts } from "@/lib/kob/engines/prices";
import { leakageCopy, runVariance } from "@/lib/kob/engines/variance";
import {
  QUESTIONS,
  RULE_CHOICES,
  isOverridden,
  nextUnanswered,
  parseRuleAnswer,
  looksLikeRuleAnswer,
  priceTightness,
  rulesComplete,
  weatherSoft,
  type RuleId,
} from "@/lib/kob/house-rules";
import { useKobStore } from "@/lib/kob/store";

export default function WorkspacePage() {
  const restaurant = useKobStore((s) => s.restaurant);
  const hydrateRestaurant = useKobStore((s) => s.hydrateRestaurant);
  const replayMorning = useKobStore((s) => s.replayMorning);
  const houseRules = useKobStore((s) => s.houseRules);
  const messages = useKobStore((s) => s.messages);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

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

  return <Workspace />;
}

function Workspace() {
  const restaurant = useKobStore((s) => s.restaurant)!;
  const setSheetOpen = useKobStore((s) => s.setSheetOpen);
  const orbMode = useKobStore((s) => s.orbMode);
  const houseRules = useKobStore((s) => s.houseRules);

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#efeae2]">
      <header className="flex h-14 items-center gap-3 bg-[#075e54] px-3 text-paper">
        <Link href="/" className="text-paper" aria-label="KOB home">
          <KobWordmark invert />
        </Link>
        <GreenOrb
          size="sm"
          mode={orbMode}
          tightness={priceTightness(houseRules)}
          soft={weatherSoft(houseRules)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{restaurant.name}</p>
          <p className="text-[0.7rem] text-paper/70">KOB · Talk</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-paper/15 px-3 py-1.5 text-sm"
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
  const overrides = useKobStore((s) => s.overrides);
  const overrideToday = useKobStore((s) => s.overrideToday);
  const setOrbMode = useKobStore((s) => s.setOrbMode);
  const addTruth = useKobStore((s) => s.addTruth);
  const setHolding = useKobStore((s) => s.setHolding);
  const setSheetOpen = useKobStore((s) => s.setSheetOpen);
  const weatherCity = useKobStore((s) => s.weatherCity);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
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
      if (isOverridden(overrides, "price")) return true;
      const cap = houseRules.price.hikePct;
      if (cap != null && a.abovePct < cap) return false;
      return true;
    });
    const leak = runVariance(lines, DEMO_POS);
    const copy = leakageCopy(leak);
    const ignoreGbp = houseRules.waste.ignoreGbp ?? 0;
    const theft = houseRules.waste.theftGbp ?? 50;
    const leakGbp = leak.reduce((s, r) => s + r.lostGbp, 0);
    const hold = [
      ...alerts.map((a) => ({
        id: `p-${a.item}`,
        text: `${a.item} is ${a.abovePct}% over house rate.`,
      })),
    ];
    if (leakGbp >= ignoreGbp) {
      hold.push({
        id: "waste",
        text:
          leakGbp >= theft
            ? `Waste flag · about £${leakGbp.toFixed(0)} vs dishes sold.`
            : copy,
      });
    }
    setHolding(hold);
    const text = [
      result.note,
      alerts.map((a) => a.note).join("\n\n"),
      leakGbp >= ignoreGbp ? copy : "Waste is under your ignore line. I will not nag.",
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
        { id: "override-price", label: "Override today", kind: "yes" },
      ],
      doneText: "Done.\nSupplier note queued. Not sent.\nI'll keep watching.",
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
        doneText: "Done.\nPrep note queued. Not sent.\nI'll keep watching.",
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
        doneText: "Done.\nReview watch queued.\nI'll keep watching.",
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

    setOrbMode("thinking");
    const acted = actOnTalk({
      text,
      restaurant,
      findings,
      reviews,
      autonomy,
      memory,
      connected,
      houseRules,
      overrides,
    });
    applyWork(acted.mutations);

    let reply = acted.reply;
    if (acted.kind === "chat") {
      setBusy(true);
      try {
        const result = await talkToKob({
          data: {
            restaurantName: restaurant.name,
            ownerName: restaurant.ownerFirstName,
            context: findings
              .map((f) => `${f.status}: ${f.headline} — ${f.detail}`)
              .join("\n"),
            memory: memory.map((m) => m.text),
            autonomy: autonomy.map((rule) => `${rule.label}: ${rule.level}`),
            messages: [...messages, ownerMsg]
              .filter((m) => m.role === "owner" || m.role === "kob")
              .slice(-8)
              .map((m) => ({
                role: m.role === "owner" ? ("owner" as const) : ("kob" as const),
                text: m.text,
              })),
          },
        });
        if (result.ok && "text" in result) reply = result.text;
      } catch {
        reply = acted.reply;
      }
      setBusy(false);
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
      // Rule answers first — they match the question on screen. Job suggestions stay after.
      actions = [...ruleButtons, ...jobActions];
      doneText = acted.doneText;
    }

    addMessage({
      id: `k-${Date.now()}`,
      role: reply.startsWith("Done") ? "done" : "kob",
      text: reply,
      actions: actions.length ? actions : undefined,
      doneText,
    });
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
    if (actionId.startsWith("rule-")) {
      const choice = Object.values(RULE_CHOICES)
        .flat()
        .find((item) => item.id === actionId);
      const ruleId = (
        Object.entries(RULE_CHOICES).find(([, list]) =>
          list.some((item) => item.id === actionId),
        )?.[0] ?? nextUnanswered(houseRules)
      ) as RuleId | null;
      if (choice && ruleId) {
        approve(id);
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
      approve(id);
      return;
    }
    if (actionId === "weather-prep") {
      void runWeather();
      approve(id);
      return;
    }
    if (actionId === "nearby-reviews") {
      void runNearbyReviews();
      approve(id);
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
      approve(id);
      return;
    }
    if (actionId === "ignore") {
      approve(id);
      addMessage({
        id: `leave-${Date.now()}`,
        role: "kob",
        text: "Left it. I'll keep watching.",
      });
      return;
    }
    approve(id);
    addTruth("You approved a job in Talk.");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
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
        className="bg-[#f0f2f5] p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message"
            className="h-11 flex-1 rounded-full border-0 bg-paper px-4 text-base text-espresso outline-none"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
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
