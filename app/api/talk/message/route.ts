import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isGeminiConfigured } from "@/lib/ai/gemini-config";
import { sameOrigin, talkAccess } from "@/lib/kob/talk/access";
import { runLiveTalk } from "@/lib/kob/talk/agent";

export const maxDuration = 60;
const inputSchema = z.object({
  restaurantId: z.string().min(1).max(100),
  conversationId: z.string().min(1).max(100),
  requestId: z.string().uuid(),
  text: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Please enter a message of up to 8,000 characters." },
      { status: 400 },
    );
  }
  try {
    const access = await talkAccess(input.restaurantId);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    const conversation = await prisma.conversation.findFirst({
      where: { id: input.conversationId, restaurantId: input.restaurantId },
    });
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    if (!isGeminiConfigured())
      return NextResponse.json(
        { error: "Talk is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    const existing = await prisma.message.findUnique({
      where: { id: input.requestId },
    });
    if (existing)
      return NextResponse.json(
        { error: "This request is already saved. Reload to see its reply." },
        { status: 409 },
      );
    const history = await prisma.message.findMany({
      where: { conversationId: input.conversationId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const recent = history.filter(
      (message) =>
        message.createdAt && Date.now() - message.createdAt.getTime() < 60_000,
    );
    if (recent[0]?.role === "USER")
      return NextResponse.json(
        { error: "A reply is already in progress. Reload shortly to see it." },
        { status: 409 },
      );
    if (recent.filter((message) => message.role === "USER").length >= 10)
      return NextResponse.json(
        { error: "Please wait a moment before sending another request." },
        { status: 429 },
      );
    await prisma.message.create({
      data: {
        id: input.requestId,
        conversationId: input.conversationId,
        role: "USER",
        content: input.text,
      },
    });
    let reply: Awaited<ReturnType<typeof runLiveTalk>>;
    try {
      reply = await runLiveTalk(access.restaurant, [
        ...history.reverse().map((message) => ({
          role:
            message.role === "USER"
              ? ("user" as const)
              : ("assistant" as const),
          content: message.content,
        })),
        { role: "user", content: input.text },
      ]);
    } catch {
      reply = {
        text: "I couldn't complete that request. Nothing was sent or changed. Please try again.",
        sources: [],
        activity: [],
        needsConnection: [],
      };
    }
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: reply.text,
          toolCalls: {
            sources: reply.sources,
            activity: reply.activity,
            needsConnection: reply.needsConnection,
          },
        },
      }),
      prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return NextResponse.json(
      { message: { id: message.id, role: "assistant", ...reply } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't save your conversation. Please reload before retrying.",
      },
      { status: 503 },
    );
  }
}
