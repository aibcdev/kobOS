import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type WorkMutations } from "@/lib/kob/act";
import {
  DEFAULT_AUTONOMY,
  DEFAULT_MEMORY,
  applyAutonomyToFindings,
  applyAutonomyToReviews,
  findingsFor,
  morningMessages,
  reviewsFor,
  type AutonomyRule,
  type ChatMessage,
  type Finding,
  type MemoryItem,
  type Restaurant,
  type Review,
} from "@/lib/kob/demo";
import { EMPTY_TOOLS, type ToolId } from "@/lib/kob/integrations";
import {
  EMPTY_RULES,
  QUESTIONS,
  RULE_CHOICES,
  RULE_ORDER,
  houseRulesFromAutonomy,
  rulesComplete,
  sanitizeHouseRules,
  todayKey,
  type HouseRules,
  type Overrides,
  type RuleId,
} from "@/lib/kob/house-rules";
import {
  findingsFromOnboard,
  restaurantFromOnboard,
} from "@/lib/kob/onboard-map";
import type { OnboardLens } from "@/lib/kob/onboard-lens";
import type { OnboardProfile } from "@/lib/kob/onboard-profile";

export type AppPane = "kob";
export type OrbMode = "idle" | "thinking" | "alert" | "done";
export type TruthEntry = { id: string; at: string; text: string };
export type HoldingItem = { id: string; text: string };

type KobStore = {
  restaurant: Restaurant | null
  findings: Finding[]
  reviews: Review[]
  messages: ChatMessage[]
  memory: MemoryItem[]
  autonomy: AutonomyRule[]
  pane: AppPane
  ownerName: string
  tone: "friendly" | "professional" | "casual"
  googleConnected: boolean
  connected: Record<ToolId, boolean>
  websiteUrl: string
  weatherCity: string
  notifyEmail: string
  approvedIds: string[]
  houseRules: HouseRules
  overrides: Overrides
  sheetOpen: boolean
  orbMode: OrbMode
  truthLog: TruthEntry[]
  holding: HoldingItem[]
  onboardProfile: OnboardProfile | null
  onboardLens: OnboardLens | null
  hydrateRestaurant: (restaurant: Restaurant) => void
  hydrateFromOnboard: (profile: OnboardProfile, lens?: OnboardLens | null) => void
  replayMorning: () => void
  setPane: (pane: AppPane) => void
  setTone: (tone: "friendly" | "professional" | "casual") => void
  setAutonomy: (id: string, level: AutonomyRule["level"]) => void
  connectGoogle: () => void
  connectTool: (id: ToolId) => void
  setWebsiteUrl: (url: string) => void
  setWeatherCity: (city: string) => void
  setNotifyEmail: (email: string) => void
  approve: (id: string) => void
  applyWork: (mutations: WorkMutations) => void
  addMessage: (message: ChatMessage) => void
  remember: (item: MemoryItem) => void
  replyToReview: (id: string) => void
  setHouseRule: (id: RuleId, value: HouseRules[RuleId]) => void
  overrideToday: (id: RuleId) => void
  setSheetOpen: (open: boolean) => void
  setOrbMode: (mode: OrbMode) => void
  addTruth: (text: string) => void
  setHolding: (items: HoldingItem[]) => void
};

function setupMessages(restaurant: Restaurant, opener?: string): ChatMessage[] {
  const first = QUESTIONS[RULE_ORDER[0]];
  return [
    {
      id: "setup-hello",
      role: "kob",
      text:
        opener ??
        `Morning, ${restaurant.ownerFirstName}. Two short answers — reviews and hours. Those are the jobs I can actually do today. Nothing public until you say so.`,
    },
    {
      id: `setup-${RULE_ORDER[0]}`,
      role: "kob",
      text: first.ask,
      actions: RULE_CHOICES[RULE_ORDER[0]].map((choice) => ({
        id: choice.id,
        label: choice.label,
        kind: "yes" as const,
      })),
    },
  ];
}

function snapshot(
  restaurant: Restaurant,
  autonomy: AutonomyRule[],
  rules: HouseRules,
  opener?: string,
) {
  const findings = applyAutonomyToFindings(findingsFor(restaurant), autonomy);
  const reviews = applyAutonomyToReviews(reviewsFor(restaurant), autonomy);
  if (!rulesComplete(rules)) {
    return {
      findings,
      reviews,
      messages: setupMessages(restaurant, opener),
      approvedIds: [] as string[],
    };
  }
  const morning = morningMessages(restaurant, autonomy);
  return {
    findings,
    reviews,
    messages: opener
      ? [
          { id: "setup-hello", role: "kob" as const, text: opener },
          ...morning.filter((m) => m.id !== "setup-hello"),
        ]
      : morning,
    approvedIds: [] as string[],
  };
}

function applyMutations(
  state: {
    restaurant: Restaurant | null
    findings: Finding[]
    reviews: Review[]
    memory: MemoryItem[]
    autonomy: AutonomyRule[]
    googleConnected: boolean
    connected: Record<ToolId, boolean>
  },
  mutations: WorkMutations,
) {
  let { restaurant, findings, reviews, memory, autonomy, googleConnected, connected } =
    state;

  if (mutations.setAutonomy?.length) {
    autonomy = autonomy.map((rule) => {
      const next = mutations.setAutonomy?.find((change) => change.id === rule.id);
      return next ? { ...rule, level: next.level } : rule;
    });
  }

  if (mutations.alignHours && restaurant) {
    const websiteMissing = /not listed|not published/i.test(
      restaurant.hoursWebsite,
    );
    restaurant = websiteMissing
      ? { ...restaurant, hoursWebsite: restaurant.hoursGoogle }
      : { ...restaurant, hoursGoogle: restaurant.hoursWebsite };
    findings = findings.map((finding) =>
      finding.ruleId === "hours"
        ? {
            ...finding,
            status: "done" as const,
            headline: websiteMissing
              ? "Hours added on the website"
              : "Google hours match the website",
            actionLabel: undefined,
          }
        : finding,
    );
  }

  if (mutations.queueMenu) {
    findings = findings.map((finding) =>
      finding.ruleId === "menu"
        ? { ...finding, status: "done" as const, actionLabel: undefined }
        : finding,
    );
  }

  if (mutations.addBookingLink) {
    findings = findings.map((finding) =>
      finding.ruleId === "google-info"
        ? { ...finding, status: "done" as const, actionLabel: undefined }
        : finding,
    );
  }

  if (mutations.approveSuggest) {
    findings = findings.map((finding) => {
      const level = autonomy.find((rule) => rule.id === finding.ruleId)?.level;
      if (finding.status !== "needs" || !finding.actionLabel) return finding;
      if (level === "always-ask") return finding;
      return { ...finding, status: "done" as const, actionLabel: undefined };
    });
  }

  if (mutations.replyHighReviews) {
    reviews = reviews.map((review) =>
      review.rating >= 4 && (review.draft || review.reply)
        ? {
            ...review,
            status: "replied" as const,
            reply: review.reply ?? review.draft,
          }
        : review,
    );
    findings = findings.map((finding) =>
      finding.ruleId === "reviews-high"
        ? { ...finding, status: "done" as const, actionLabel: undefined }
        : finding,
    );
  }

  if (mutations.addMemory) {
    const key = mutations.addMemory.text.trim().toLowerCase().replace(/\.+$/, "");
    memory = [
      mutations.addMemory,
      ...memory.filter(
        (item) => item.text.trim().toLowerCase().replace(/\.+$/, "") !== key,
      ),
    ];
  }

  if (mutations.setAutonomy?.some((change) => change.level === "handle")) {
    findings = findings.map((finding) => {
      const change = mutations.setAutonomy?.find((item) => item.id === finding.ruleId);
      if (change?.level === "handle" && finding.status === "needs") {
        return { ...finding, status: "done" as const, actionLabel: undefined };
      }
      return finding;
    });
  }

  return { restaurant, findings, reviews, memory, autonomy, googleConnected, connected };
}

export const useKobStore = create<KobStore>()(
  persist(
    (set, get) => ({
      restaurant: null,
      findings: [],
      reviews: [],
      messages: [],
      memory: DEFAULT_MEMORY,
      autonomy: DEFAULT_AUTONOMY,
      pane: "kob",
      ownerName: "there",
      tone: "casual",
      googleConnected: false,
      connected: { ...EMPTY_TOOLS },
      websiteUrl: "",
      weatherCity: "Cape Town",
      notifyEmail: "",
      approvedIds: [],
      houseRules: { ...EMPTY_RULES },
      overrides: {},
      sheetOpen: false,
      orbMode: "idle",
      truthLog: [],
      holding: [],
      onboardProfile: null,
      onboardLens: null,
      hydrateRestaurant: (restaurant) => {
        const autonomy = get().autonomy;
        set({
          restaurant,
          ownerName: restaurant.ownerFirstName,
          onboardProfile: null,
          onboardLens: null,
          pane: "kob",
          ...snapshot(restaurant, autonomy, get().houseRules),
        });
      },
      hydrateFromOnboard: (profile, lens) => {
        const restaurant = restaurantFromOnboard(profile);
        const autonomy = lens?.autonomy ?? get().autonomy;
        const houseRules = houseRulesFromAutonomy(autonomy);
        const base = snapshot(restaurant, autonomy, houseRules, lens?.talkOpener);
        const onboardFindings = findingsFromOnboard(profile);
        const ordered = lens?.priority?.length
          ? [
              ...onboardFindings.filter((f) =>
                lens.priority.some((p) => f.area.includes(p) || f.id.includes(p)),
              ),
              ...onboardFindings,
              ...base.findings,
            ].filter((item, i, all) => all.findIndex((x) => x.id === item.id) === i)
          : [...onboardFindings, ...base.findings];
        set({
          restaurant,
          ownerName: restaurant.ownerFirstName,
          onboardProfile: profile,
          onboardLens: lens ?? null,
          autonomy,
          houseRules,
          pane: "kob",
          websiteUrl: profile.website ?? "",
          weatherCity: profile.city || "London",
          googleConnected: Boolean(lens?.connected.google ?? profile.source === "places"),
          connected: lens?.connected
            ? { ...EMPTY_TOOLS, ...lens.connected }
            : profile.source === "places"
              ? {
                  ...get().connected,
                  google: true,
                  website: Boolean(profile.website),
                }
              : get().connected,
          findings: ordered.slice(0, 14),
          reviews: base.reviews,
          messages: base.messages,
          memory: lens?.memoryNote
            ? [
                {
                  id: "onboard-matters",
                  text: lens.memoryNote,
                  learned: lens.talkOpener,
                },
                ...get().memory,
              ]
            : get().memory,
          approvedIds: base.approvedIds,
        });
      },
      replayMorning: () => {
        const restaurant = get().restaurant;
        if (!restaurant) return;
        set({
          pane: "kob",
          ...snapshot(restaurant, get().autonomy, get().houseRules),
        });
      },
      setPane: () => set({ pane: "kob" }),
      setTone: (tone) => set({ tone }),
      setAutonomy: (id, level) => {
        const autonomy = get().autonomy.map((rule) =>
          rule.id === id ? { ...rule, level } : rule,
        );
        let findings = get().findings;
        if (level === "handle") {
          findings = findings.map((finding) =>
            finding.ruleId === id && finding.status === "needs"
              ? { ...finding, status: "done" as const }
              : finding,
          );
        }
        const restaurant = get().restaurant;
        const reviews = restaurant
          ? applyAutonomyToReviews(reviewsFor(restaurant), autonomy)
          : get().reviews;
        set({ autonomy, findings, reviews });
      },
      connectGoogle: () =>
        set({ googleConnected: true, connected: { ...get().connected, google: true } }),
      connectTool: (id) =>
        set({
          connected: { ...get().connected, [id]: true },
          googleConnected: id === "google" ? true : get().googleConnected,
        }),
      setWebsiteUrl: (websiteUrl) =>
        set({
          websiteUrl: websiteUrl.trim(),
          connected: websiteUrl.trim()
            ? { ...get().connected, website: true }
            : get().connected,
        }),
      setWeatherCity: (weatherCity) =>
        set({
          weatherCity: weatherCity.trim() || "Cape Town",
          connected: { ...get().connected, weather: true },
        }),
      setNotifyEmail: (notifyEmail) =>
        set({
          notifyEmail: notifyEmail.trim(),
          connected: notifyEmail.trim()
            ? { ...get().connected, email: true }
            : get().connected,
        }),
      applyWork: (mutations) => {
        const next = applyMutations(get(), mutations);
        set(next);
      },
      approve: (id) => {
        const msg = get().messages.find((m) => m.id === id);
        const autonomy = get().autonomy;
        if (!msg?.doneText) {
          set({ approvedIds: [...get().approvedIds, id], orbMode: "done" });
          return;
        }
        const next = applyMutations(get(), {
          approveSuggest: true,
          replyHighReviews: true,
          alignHours: true,
          queueMenu: true,
          addBookingLink: true,
        });
        const truth: TruthEntry = {
          id: `t-${Date.now()}`,
          at: new Date().toISOString(),
          text: msg.doneText.split("\n").filter(Boolean)[1] ?? "Approved a job",
        };
        set({
          ...next,
          approvedIds: [...get().approvedIds, id],
          orbMode: "done",
          truthLog: [truth, ...get().truthLog].slice(0, 40),
          messages: [
            ...get().messages.map((m) =>
              m.id === id ? { ...m, actions: undefined } : m,
            ),
            { id: `${id}-done`, role: "done", text: msg.doneText },
          ],
        });
      },
      addMessage: (message) =>
        set({ messages: [...get().messages, message] }),
      remember: (item) => set({ memory: [item, ...get().memory] }),
      replyToReview: (id) =>
        set({
          reviews: get().reviews.map((r) =>
            r.id === id && r.draft
              ? { ...r, status: "replied", reply: r.draft }
              : r,
          ),
        }),
      setHouseRule: (id, value) => {
        const houseRules = { ...get().houseRules, [id]: value };
        set({ houseRules });
      },
      overrideToday: (id) =>
        set({ overrides: { ...get().overrides, [id]: todayKey() } }),
      setSheetOpen: (sheetOpen) => set({ sheetOpen }),
      setOrbMode: (orbMode) => set({ orbMode }),
      addTruth: (text) =>
        set({
          truthLog: [
            { id: `t-${Date.now()}`, at: new Date().toISOString(), text },
            ...get().truthLog,
          ].slice(0, 40),
        }),
      setHolding: (holding) => set({ holding }),
    }),
    {
      name: "kob-talk",
      partialize: (state) => ({
        restaurant: state.restaurant,
        findings: state.findings,
        reviews: state.reviews,
        messages: state.messages,
        memory: state.memory,
        autonomy: state.autonomy,
        ownerName: state.ownerName,
        tone: state.tone,
        googleConnected: state.googleConnected,
        connected: state.connected,
        websiteUrl: state.websiteUrl,
        weatherCity: state.weatherCity,
        notifyEmail: state.notifyEmail,
        approvedIds: state.approvedIds,
        houseRules: state.houseRules,
        overrides: state.overrides,
        truthLog: state.truthLog,
        holding: state.holding,
        onboardProfile: state.onboardProfile,
        onboardLens: state.onboardLens,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<KobStore>;
        const autonomy = (saved.autonomy ?? current.autonomy).map((rule) => {
          const fresh = DEFAULT_AUTONOMY.find((item) => item.id === rule.id);
          return fresh ? { ...fresh, level: rule.level } : rule;
        });
        const rawMessages = (saved.messages ?? current.messages) as Array<{
          role: string
        }>;
        const staleQuiz =
          /cut prep|bad deliveries in a month|stay late|Kitchens are messy|sales-per-hour|supplier raises prices/i;
        const oldShape = Boolean(
          saved.houseRules &&
            ("price" in (saved.houseRules as object) ||
              "weather" in (saved.houseRules as object) ||
              "supplier" in (saved.houseRules as object)),
        );
        const messages = rawMessages
          .filter((message) => message.role !== "note")
          .filter((message) => {
            if (!oldShape) return true;
            const text = "text" in message ? String(message.text ?? "") : "";
            return !staleQuiz.test(text);
          }) as ChatMessage[];
        const houseRules = oldShape
          ? saved.onboardLens
            ? houseRulesFromAutonomy(autonomy)
            : { ...EMPTY_RULES }
          : saved.onboardLens && !sanitizeHouseRules(saved.houseRules).reviews.answer
            ? houseRulesFromAutonomy(autonomy)
            : sanitizeHouseRules(saved.houseRules);
        return {
          ...current,
          ...saved,
          autonomy,
          messages,
          pane: "kob" as const,
          connected: { ...EMPTY_TOOLS, ...saved.connected },
          websiteUrl: saved.websiteUrl ?? "",
          weatherCity: saved.weatherCity ?? "Cape Town",
          notifyEmail: saved.notifyEmail ?? "",
          houseRules,
          overrides: saved.overrides ?? {},
          truthLog: saved.truthLog ?? [],
          holding: saved.holding ?? [],
          onboardProfile: saved.onboardProfile ?? null,
          onboardLens: saved.onboardLens ?? null,
        };
      },
    },
  ),
);

