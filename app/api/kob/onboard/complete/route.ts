import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichOnboardInput } from "@/lib/kob/onboard-enrich";
import { buildOnboardLens } from "@/lib/kob/onboard-lens";
import { roleLabel, type OnboardProfile } from "@/lib/kob/onboard-profile";
import { EMPTY_ANSWERS, type OnboardAnswers } from "@/lib/kob/onboard-wizard";

export const runtime = "nodejs";

const Answers = z.object({
  companyName: z.string().min(2).max(200),
  role: z.enum(["owner", "gm", "chef", "marketing", "ops", "other"]),
  matters: z.enum(["covers", "google", "reviews", "waste", "website", "delivery", "brand"]).nullable(),
  start: z.array(z.string()).max(12),
  scope: z.enum(["one_room", "whole_group"]).nullable(),
  book: z.array(z.string()).max(8),
  chat: z.array(z.string()).max(8),
  menu: z.enum(["website", "printed", "drive"]).nullable(),
  phone: z.enum(["soon", "skip"]).nullable(),
  run: z.enum(["supervised", "assisted", "autonomous"]).nullable(),
});

const Body = z.object({
  companyName: z.string().min(2).max(200),
  answers: Answers,
  profile: z.unknown().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Complete the setup questions." }, { status: 400 });
  }

  const answers = { ...EMPTY_ANSWERS, ...parsed.data.answers } as OnboardAnswers;
  answers.companyName = parsed.data.companyName.trim();
  answers.run = answers.run ?? "assisted";
  answers.phone = answers.phone ?? "skip";
  answers.matters = answers.matters ?? "covers";

  let profile = parsed.data.profile as OnboardProfile | undefined;
  if (!profile?.name) {
    profile = await enrichOnboardInput(answers.companyName, answers.role);
  } else {
    profile = {
      ...profile,
      role: answers.role,
      roleLabel: roleLabel(answers.role),
      companyName: answers.companyName,
    };
  }

  const lens = buildOnboardLens(answers, profile);
  return NextResponse.json({ profile, lens, answers });
}
