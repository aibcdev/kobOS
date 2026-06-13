import { stepCountIs, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { geminiConfigError, getChatLanguageModel, isGeminiConfigured } from "@/lib/ai/gemini-config";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { buildChatSystemPrompt } from "@/lib/chat/system-prompt";
import { buildChatTools } from "@/lib/chat/tools";
import { prisma } from "@/lib/db/prisma";
import { buildGrowthAgentBriefingContext } from "@/lib/growth-agent/restaurant-context";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  conversationId: z.string().min(12),
  message: z.string().min(1).max(8000),
});

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return new Response(session.message, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Validation failed", { status: 422 });
  }

  const { restaurantId, conversationId, message } = parsed.data;

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, restaurantId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });
  if (!conversation) return new Response("Conversation not found", { status: 404 });

  const [ctx, restaurant] = await Promise.all([
    buildGrowthAgentBriefingContext(restaurantId),
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { aiPersonality: true, name: true } }),
  ]);
  if (!ctx || !restaurant) return new Response("Restaurant not found", { status: 404 });

  if (!isGeminiConfigured()) {
    return new Response(geminiConfigError(), { status: 503 });
  }

  await prisma.message.create({
    data: { conversationId, role: "USER", content: message },
  });

  const history: ModelMessage[] = conversation.messages.map((m) => ({
    role: m.role === "ASSISTANT" ? "assistant" : m.role === "SYSTEM" ? "system" : "user",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  const result = streamText({
    model: getChatLanguageModel(),
    system: buildChatSystemPrompt(ctx, restaurant.aiPersonality),
    messages: history,
    tools: buildChatTools(restaurantId),
    stopWhen: stepCountIs(3),
    onFinish: async ({ text, toolResults }) => {
      let content = text;
      if (toolResults?.length) {
        const summaries = toolResults
          .map((tr) => `[${tr.toolName}] ${JSON.stringify(tr.output)}`)
          .join("\n");
        content = text ? `${text}\n\n${summaries}` : summaries;
      }

      await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId,
            role: "ASSISTANT",
            content: content || "(done)",
          },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            title:
              conversation.title === "New chat" && message.length > 0
                ? message.slice(0, 48)
                : conversation.title,
          },
        }),
      ]);
    },
  });

  return result.toTextStreamResponse();
}
