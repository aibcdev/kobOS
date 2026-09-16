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

export type WizardStepId =
  | "name"
  | "role"
  | "matters"
  | "start"
  | "scope"
  | "book"
  | "chat"
  | "menu"
  | "phone"
  | "run";

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
  start: [],
  scope: null,
  book: [],
  chat: [],
  menu: null,
  phone: null,
  run: null,
};

export const WIZARD_STEPS: WizardStepId[] = [
  "name",
  "role",
  "matters",
  "start",
  "scope",
  "book",
  "chat",
  "menu",
  "phone",
  "run",
];

export const STEP_COPY: Record<
  WizardStepId,
  { title: string; hint?: string; multi?: boolean; skippable?: boolean }
> = {
  name: { title: "What is your restaurant called?" },
  role: { title: "What is your role?" },
  matters: { title: "What matters more to you at the moment?" },
  start: {
    title: "Where should I start?",
    hint: "Pick one or more. Phone and bookings stay Coming soon.",
    multi: true,
  },
  scope: { title: "Should I start on your whole group, or one room?" },
  book: {
    title: "Where do guests book?",
    hint: "OpenTable, Resy, and the phone are Coming soon.",
    multi: true,
    skippable: true,
  },
  chat: {
    title: "Where does your team message you?",
    hint: "Email works now. WhatsApp is Coming soon.",
    multi: true,
    skippable: true,
  },
  menu: { title: "Where is the live menu kept?", skippable: true },
  phone: {
    title: "Want KOB to answer the phone?",
    hint: "KOB will not take calls yet.",
    skippable: true,
  },
  run: { title: "Last one — how much should I run on my own?" },
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

export const START_CHIPS: Chip[] = [
  { id: "all", label: "All of it" },
  { id: "reviews", label: "Reviews" },
  { id: "google", label: "Google listing" },
  { id: "website", label: "Website" },
  { id: "kitchen", label: "Kitchen / waste" },
  { id: "reservations", label: "Reservations", soon: true },
  { id: "marketing", label: "Marketing", soon: true },
  { id: "phone", label: "Phone", soon: true },
];

export const SCOPE_CHIPS: Chip[] = [
  { id: "whole_group", label: "Whole group" },
  { id: "one_room", label: "One room first" },
];

export const BOOK_CHIPS: Chip[] = [
  { id: "website", label: "Website" },
  { id: "google", label: "Google" },
  { id: "walkin", label: "Walk-in" },
  { id: "opentable", label: "OpenTable / Resy", soon: true },
  { id: "phone", label: "Phone", soon: true },
];

export const CHAT_CHIPS: Chip[] = [
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp", soon: true },
  { id: "imessage", label: "iMessage", soon: true },
  { id: "other", label: "Other" },
];

export const MENU_CHIPS: Chip[] = [
  { id: "website", label: "On the website" },
  { id: "printed", label: "Printed only" },
  { id: "drive", label: "Google Drive" },
];

export const PHONE_CHIPS: Chip[] = [
  { id: "soon", label: "Coming soon — tell me when it lands" },
  { id: "skip", label: "Skip for now" },
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
    control: "You approve hours, complaints, prices, and kitchen notes. KOB handles easy 5-stars.",
  },
  autonomous: {
    see: "KOB tells you what ran. Complaints and prices stay with you.",
    control: "Five-stars go out in your tone. Hours wait for Apply. No phone. No till.",
  },
};

export function chipsFor(step: WizardStepId): Chip[] {
  switch (step) {
    case "role":
      return ROLE_CHIPS;
    case "matters":
      return MATTERS_CHIPS;
    case "start":
      return START_CHIPS;
    case "scope":
      return SCOPE_CHIPS;
    case "book":
      return BOOK_CHIPS;
    case "chat":
      return CHAT_CHIPS;
    case "menu":
      return MENU_CHIPS;
    case "phone":
      return PHONE_CHIPS;
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
    case "role":
      return Boolean(answers.role);
    case "matters":
      return Boolean(answers.matters);
    case "start":
      return answers.start.length > 0;
    case "scope":
      return Boolean(answers.scope);
    case "book":
      return answers.book.length > 0;
    case "chat":
      return answers.chat.length > 0;
    case "menu":
      return Boolean(answers.menu);
    case "phone":
      return Boolean(answers.phone);
    case "run":
      return Boolean(answers.run);
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
