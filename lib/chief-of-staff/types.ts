import type { AiPersonality, TaskCategory, TaskSource, TaskStatus } from "@prisma/client";

export type HolidayBlock = {
  eventName: string;
  daysAway: number;
  emailPrepared: boolean;
  instagramPrepared: boolean;
  bannerPrepared: boolean;
};

export type TodayBriefSummary = {
  revenueHealthLine: string;
  revenueHeadline?: string | null;
  taskCount: number;
  totalMinutes: number;
  revenueOpportunityLow: number | null;
  revenueOpportunityHigh: number | null;
  needToKnow: string[];
  suggestions: string[];
  holidayBlock: HolidayBlock | null;
};

export type ChiefOfStaffTaskDto = {
  id: string;
  title: string;
  detail: string;
  category: TaskCategory;
  source: TaskSource;
  status: TaskStatus;
  impactLabel: string | null;
  estimatedMinutes: number;
  confidenceScore: number;
  revenueLowGbp: number | null;
  revenueHighGbp: number | null;
  requiresIntegration: string | null;
  auditId: string | null;
};

export type TodayBriefPayload = {
  greeting: string;
  summary: TodayBriefSummary;
  tasks: ChiefOfStaffTaskDto[];
  aiPersonality: AiPersonality;
  generatedAt: string;
};

export type TaskDraftInput = {
  title: string;
  detail?: string;
  category: TaskCategory;
  source: TaskSource;
  impactLabel?: string;
  estimatedMinutes?: number;
  confidenceScore?: number;
  revenueLowGbp?: number;
  revenueHighGbp?: number;
  requiresIntegration?: string;
  auditId?: string;
  draftPayload?: Record<string, unknown>;
};

export const PERSONALITY_LABELS: Record<AiPersonality, string> = {
  BALANCED: "Balanced",
  WARM: "Warm",
  DIRECT: "Direct",
  CONCISE: "Concise",
  SASSY: "Sassy",
};

export const PERSONALITY_HINTS: Record<AiPersonality, string> = {
  BALANCED: "Balanced, thoughtful, and clear.",
  WARM: "Encouraging, friendly, and reassuring.",
  DIRECT: "Straightforward, decisive, and efficient.",
  CONCISE: "Minimal, high-signal, and brief.",
  SASSY: "Playful, witty, and a little sharp.",
};
