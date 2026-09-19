import type { OnboardRole } from "@/lib/kob/onboard-profile";
import type { JobKey } from "@/lib/kob/demo-data";

export type MattersId =
  | "covers"
  | "google"
  | "reviews"
  | "waste"
  | "website"
  | "delivery"
  | "brand";

export type StartJobId = "all" | JobKey | "phone";

export type ScopeId = "one_room" | "whole_group";

export type BookId = "website" | "google" | "walkin" | "opentable" | "phone";

export type ChatId = "email" | "whatsapp" | "imessage" | "other";

export type MenuId = "website" | "printed" | "drive";

export type PhoneChoiceId = "soon" | "skip";

export type RunLevelId = "supervised" | "assisted" | "autonomous";

export type Chip = {
  id: string
  label: string
  icon?: string
  soon?: boolean
};

/** Value-first flow: search → findings → role → matters → autonomy → account */
export type WizardStepId =
  | "name"
  | "findings"
  | "role"
  | "matters"
  | "run"
  | "account";

export type OnboardAnswers = {
  companyName: string
  role: OnboardRole
  matters: MattersId | null
  start: StartJobId[]
  scope: ScopeId | null
  book: BookId[]
  chat: ChatId[]
  menu: MenuId | null
  phone: PhoneChoiceId | null
  run: RunLevelId | null
};

export const EMPTY_ANSWERS: OnboardAnswers = {
  companyName: "",
  role: "owner",
  matters: null,
  start: ["all"],
  scope: "one_room",
  book: ["google"],
  chat: ["email"],
  menu: "website",
  phone: "skip",
  run: null,
};

export const WIZARD_STEPS: WizardStepId[] = [
  "name",
  "findings",
  "role",
  "matters",
  "run",
  "account",
];

export const STEP_COPY: Record<
  WizardStepId,
  { title: string; hint?: string; multi?: boolean; skippable?: boolean }
> = {
  name: { title: "What is your restaurant called?" },
  findings: {
    title: "I already see a few things",
    hint: "From public Google and your site — nothing private yet.",
  },
  role: { title: "What is your role?" },
  matters: { title: "What matters most right now?" },
  run: { title: "How much should I run on my own?" },
  account: {
    title: "Create your account to keep this trial",
    hint: "7 days free, no card. Without an account, work stays on this device only.",
  },
};

export const ROLE_CHIPS: Chip[] = [
  { id: "owner", label: "Owner" },
  { id: "gm", label: "General manager" },
  { id: "chef", label: "Chef / kitchen" },
  { id: "marketing", label: "Marketing" },
  { id: "ops", label: "Ops / multi-site" },
  { id: "other", label: "Other" },
];

export const MATTERS_CHIPS: Chip[] = [
  { id: "covers", label: "More covers / footfall" },
  { id: "google", label: "Google listing right" },
  { id: "reviews", label: "Reviews / reputation" },
  { id: "waste", label: "Kitchen cost / food waste" },
  { id: "website", label: "Website / booking path" },
  { id: "delivery", label: "Delivery apps (watch only)" },
  { id: "brand", label: "Brand / photos" },
];

export const RUN_CHIPS: Chip[] = [
  { id: "supervised", label: "Supervised" },
  { id: "assisted", label: "Assisted" },
  { id: "autonomous", label: "Autonomous" },
];

export const RUN_DETAIL: Record<RunLevelId, { see: string; control: string }> = {
  supervised: {
    see: "KOB shows every draft in Talk before anything moves.",
    control: "You approve every public job — hours, reviews, menu, supplier notes.",
  },
  assisted: {
    see: "A morning pass in Talk. Five-stars can go on a rule you set.",
    control: "You approve hours, complaints, prices, and kitchen notes. Drafts only until verified.",
  },
  autonomous: {
    see: "KOB tells you what ran. Complaints and prices stay with you.",
    control: "Five-star drafts in your tone. Hours wait for Apply. No phone. No till.",
  },
};

export function chipsFor(step: WizardStepId): Chip[] {
  switch (step) {
    case "role":
      return ROLE_CHIPS;
    case "matters":
      return MATTERS_CHIPS;
    case "run":
      return RUN_CHIPS;
    default:
      return [];
  }
}

export function stepComplete(step: WizardStepId, answers: OnboardAnswers): boolean {
  switch (step) {
    case "name":
      return answers.companyName.trim().length >= 2;
    case "findings":
      return true;
    case "role":
      return Boolean(answers.role);
    case "matters":
      return Boolean(answers.matters);
    case "run":
      return Boolean(answers.run);
    case "account":
      return true;
  }
}

export function toggleMulti(current: string[], id: string, allId?: string): string[] {
  if (allId && id === allId) {
    return current.includes(allId) ? [] : [allId];
  }
  const withoutAll = allId ? current.filter((x) => x !== allId) : current;
  if (withoutAll.includes(id)) return withoutAll.filter((x) => x !== id);
  return [...withoutAll, id];
}

/** Public findings bullets from Places enrich profile */
export function findingsFromProfile(profile: {
  biggestIssue?: { label: string; why: string }
  otherSignals?: string[]
  googlePerformance?: { summary: string }
  websiteView?: { hasSite: boolean; summary: string }
  rating?: number | null
  reviewCount?: number | null
}): string[] {
  const out: string[] = [];
  if (profile.biggestIssue?.label) {
    out.push(`${profile.biggestIssue.label} — ${profile.biggestIssue.why}`);
  }
  if (profile.googlePerformance?.summary) out.push(profile.googlePerformance.summary);
  if (profile.websiteView?.summary) out.push(profile.websiteView.summary);
  if (profile.rating != null && profile.reviewCount != null) {
    out.push(`Public rating ${profile.rating} from ${profile.reviewCount} reviews.`);
  }
  for (const s of profile.otherSignals ?? []) {
    if (out.length >= 5) break;
    out.push(s);
  }
  if (!out.length) out.push("I found your place. I’ll dig deeper in Talk once you’re in.");
  return out.slice(0, 5);
}
