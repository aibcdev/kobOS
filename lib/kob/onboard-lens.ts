import { DEFAULT_AUTONOMY, type AutonomyLevel, type AutonomyRule } from "@/lib/kob/demo";
import { EMPTY_TOOLS, type ToolId } from "@/lib/kob/integrations";
import type { OnboardProfile } from "@/lib/kob/onboard-profile";
import type {
  MattersId,
  OnboardAnswers,
  RunLevelId,
  StartJobId,
} from "@/lib/kob/onboard-wizard";

export type OwnerType =
  | "reputation"
  | "kitchen_margin"
  | "discovery"
  | "brand_site"
  | "ops_multisite";

export type PriorityId =
  | "reviews"
  | "google"
  | "website"
  | "kitchen"
  | "covers"
  | "delivery"
  | "brand";

export type OnboardLens = {
  ownerType: OwnerType
  ownerTypeLabel: string
  priority: PriorityId[]
  firstJobLabel: string
  talkOpener: string
  autonomy: AutonomyRule[]
  connected: Record<ToolId, boolean>
  memoryNote: string
};

const MATTERS_LABEL: Record<MattersId, string> = {
  covers: "covers and footfall",
  google: "getting the Google listing right",
  reviews: "reviews and reputation",
  waste: "kitchen cost and food waste",
  website: "the website and booking path",
  delivery: "delivery apps — watch only, we do not replace them",
  brand: "brand and photos",
};

const TYPE_LABEL: Record<OwnerType, string> = {
  reputation: "Reputation owner",
  kitchen_margin: "Kitchen-margin owner",
  discovery: "Discovery / covers owner",
  brand_site: "Brand and site owner",
  ops_multisite: "Multi-site ops",
};

function ownerType(answers: OnboardAnswers, profile: OnboardProfile): OwnerType {
  if (answers.scope === "whole_group" || answers.role === "ops") return "ops_multisite";
  if (answers.matters === "waste" || answers.role === "chef") return "kitchen_margin";
  if (answers.matters === "reviews") return "reputation";
  if (answers.matters === "website" || answers.matters === "brand") return "brand_site";
  if (answers.matters === "covers" || answers.matters === "google") return "discovery";
  if (profile.biggestIssue.id === "food_waste") return "kitchen_margin";
  if (profile.biggestIssue.id === "branding") return "brand_site";
  return "discovery";
}

function mattersToPriority(id: MattersId): PriorityId {
  if (id === "covers") return "covers";
  if (id === "google") return "google";
  if (id === "reviews") return "reviews";
  if (id === "waste") return "kitchen";
  if (id === "website") return "website";
  if (id === "delivery") return "delivery";
  return "brand";
}

function startToPriority(id: StartJobId): PriorityId | null {
  if (id === "all" || id === "phone" || id === "reservations" || id === "marketing" || id === "events" || id === "reporting") {
    return null;
  }
  if (id === "kitchen") return "kitchen";
  if (id === "reviews") return "reviews";
  if (id === "google") return "google";
  if (id === "website") return "website";
  return null;
}

function rankPriority(answers: OnboardAnswers, profile: OnboardProfile): PriorityId[] {
  const ranked: PriorityId[] = [];
  const push = (id: PriorityId) => {
    if (!ranked.includes(id)) ranked.push(id);
  };

  if (answers.matters) push(mattersToPriority(answers.matters));

  for (const job of answers.start) {
    const p = startToPriority(job);
    if (p) push(p);
  }

  if (answers.start.includes("all")) {
    push("reviews");
    push("google");
    push("website");
    push("kitchen");
  }

  if ((profile.rating ?? 5) < 4.2) push("reviews");
  if (!profile.websiteView.hasSite) push("website");
  if (profile.biggestIssue.id === "food_waste") push("kitchen");
  if (profile.popularity.rankHint.includes("Quieter")) push("covers");

  push("reviews");
  push("google");
  push("website");
  push("kitchen");
  return ranked;
}

function seedAutonomy(run: RunLevelId | null): AutonomyRule[] {
  const mode: Record<string, AutonomyLevel> =
    run === "supervised"
      ? {
          "reviews-high": "always-ask",
          "reviews-low": "always-ask",
          hours: "always-ask",
          menu: "always-ask",
          "google-info": "always-ask",
          promos: "always-ask",
        }
      : run === "autonomous"
        ? {
            "reviews-high": "handle",
            "reviews-low": "always-ask",
            hours: "ask",
            menu: "always-ask",
            "google-info": "ask",
            promos: "always-ask",
          }
        : {
            "reviews-high": "handle",
            "reviews-low": "always-ask",
            hours: "ask",
            menu: "always-ask",
            "google-info": "ask",
            promos: "always-ask",
          };

  return DEFAULT_AUTONOMY.map((rule) => ({
    ...rule,
    level: mode[rule.id] ?? "always-ask",
  }));
}

function seedConnected(answers: OnboardAnswers, profile: OnboardProfile): Record<ToolId, boolean> {
  const connected = { ...EMPTY_TOOLS };
  connected.google = true;
  connected.website = Boolean(profile.website) || answers.book.includes("website") || answers.menu === "website";
  connected.email = answers.chat.includes("email");
  connected.weather = answers.start.includes("kitchen") || answers.start.includes("all") || answers.matters === "waste";
  connected.accounting =
    answers.start.includes("kitchen") || answers.start.includes("all") || answers.matters === "waste";
  connected.pos = false;
  connected.bookings = false;
  connected.whatsapp = false;
  connected.delivery = false;
  return connected;
}

function firstJobLabel(priority: PriorityId[]): string {
  const top = priority[0] ?? "reviews";
  if (top === "kitchen") return "kitchen and food waste";
  if (top === "google") return "the Google listing";
  if (top === "website") return "the website";
  if (top === "covers") return "discovery and covers";
  if (top === "delivery") return "watching delivery vs your own site";
  if (top === "brand") return "listing photos and brand";
  return "reviews";
}

export function buildOnboardLens(
  answers: OnboardAnswers,
  profile: OnboardProfile,
): OnboardLens {
  const type = ownerType(answers, profile);
  const priority = rankPriority(answers, profile);
  const first = firstJobLabel(priority);
  const matters = answers.matters ? MATTERS_LABEL[answers.matters] : "the listing";
  const issue = profile.biggestIssue?.label;
  const talkOpener = issue
    ? `I found work already — starting with ${issue}. You said ${matters} matters most. Nothing public goes live without you. Phone and the till are Coming next.`
    : `I’ll start with ${first} — you said ${matters} matters most. Nothing public goes live without you. Phone and the till are Coming next.`;

  return {
    ownerType: type,
    ownerTypeLabel: TYPE_LABEL[type],
    priority,
    firstJobLabel: first,
    talkOpener,
    autonomy: seedAutonomy(answers.run),
    connected: seedConnected(answers, profile),
    memoryNote: `What matters now: ${matters}. Start with ${first}.`,
  };
}
