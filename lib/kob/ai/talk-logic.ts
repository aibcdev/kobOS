import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["owner", "kob"]),
  text: z.string().max(1200),
});

export const TalkInputSchema = z.object({
  restaurantName: z.string().max(80),
  ownerName: z.string().max(40),
  context: z.string().max(1800),
  memory: z.array(z.string().max(200)).max(8),
  autonomy: z.array(z.string().max(120)).max(8).optional(),
  messages: z.array(MessageSchema).max(12),
});

let callsThisProcess = 0;
const MAX_CALLS = 40;

export async function talkToKobData(data: z.infer<typeof TalkInputSchema>) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false as const, error: "unavailable" };
  if (callsThisProcess >= MAX_CALLS) {
    return { ok: false as const, error: "busy" };
  }
  callsThisProcess += 1;

  const memoryBlock = data.memory.length
    ? `Owner instructions in memory:\n- ${data.memory.join("\n- ")}`
    : "No extra memory yet.";
  const autonomyBlock = data.autonomy?.length
    ? `Autonomy rules (ask = Suggest, handle = Autopilot, always-ask = never without the owner):\n- ${data.autonomy.join("\n- ")}`
    : "Default: ask before public changes. 4–5 star reviews may already be on autopilot.";

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 280,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are KOB, the AI restaurant manager for ${data.restaurantName}. You work for ${data.ownerName}.
You only do jobs you can actually see today: public Google reviews, Google vs website hours, and photos of delivery notes. Phone, till, rotas, and supplier networks are Coming soon — never pretend you have them.
You do the work. Never send the owner to a dashboard. They talk. You take it. Nothing public until they say so.
Obey autonomy rules strictly. handle = do it, then tell the owner. ask = propose and wait. always-ask = never act, even if similar.
Speak like a manager on service: short, data then action. No hello. No small talk. No emoji. No markdown. Never call yourself an AI.
Do not ask about weather prep, overtime, or bad deliveries. You cannot see those.
If they ask about margins: you can read a delivery photo and flag price rises. You cannot guess food cost without a till.
One action. Wait for yes.
Context from this morning:\n${data.context}\n${memoryBlock}\n${autonomyBlock}`,
        },
        ...data.messages.map((m) => ({
          role: m.role === "owner" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        })),
      ],
    }),
  });

  if (!res.ok) return { ok: false as const, error: "unavailable" };
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) return { ok: false as const, error: "unavailable" };
  return { ok: true as const, text };
}
