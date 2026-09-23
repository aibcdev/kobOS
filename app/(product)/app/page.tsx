import Link from "next/link";
import { CreateWorkspace } from "@/components/kob-talk/create-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { listTalkConnectors } from "@/lib/kob/talk/connectors";
import { LiveWorkspace } from "@/components/kob-talk/live-workspace";
import DemoWorkspace from "@/components/kob-talk/demo-workspace";
import type { TalkMessage } from "@/lib/kob/talk/types";

export const dynamic = "force-dynamic";

function Entry({ error }: { error?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <Link href="/" className="font-display text-2xl">
        KOB
      </Link>
      <div>
        <p className="text-sm text-sage">Your restaurant, one conversation</p>
        <h1 className="mt-3 font-display text-4xl">What needs you today?</h1>
        <p className="mt-4 text-muted">
          Connect your inbox and calendar. Get answers from your accounts and
          prepare the next step together.
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-line bg-paper p-4 text-sm"
        >
          {error}
        </p>
      ) : null}
      <Link
        href="/login?next=%2Fapp"
        className="rounded-full bg-espresso px-5 py-3 text-center font-medium text-paper"
      >
        Sign in to your workspace
      </Link>
      <Link href="/app?demo=1" className="text-center text-sm underline">
        Explore an example with sample data
      </Link>
      <p className="text-center text-xs text-muted">
        Gmail and Calendar are read-only. Drafts stay in Talk until you copy
        them.
      </p>
    </main>
  );
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.demo === "1") return <DemoWorkspace />;
  let user;
  try {
    const supabase = await createSupabaseServerClient();
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    return (
      <Entry error="Sign-in is temporarily unavailable. Please try again shortly." />
    );
  }
  if (!user) return <Entry />;
  const loaded = await loadWorkspace(user.id, params.r);
  if ("error" in loaded) return <Entry error={loaded.error} />;
  if ("empty" in loaded) return <CreateWorkspace />;
  return (
    <LiveWorkspace
      key={loaded.restaurant.id}
      {...loaded}
      connectionResult={
        typeof params.connected === "string" &&
        loaded.initialConnectors.some(
          (connector) =>
            connector.provider === params.connected && connector.hasAccount,
        )
          ? params.connected
          : null
      }
      connectionError={
        typeof params.connectionError === "string"
          ? params.connectionError.slice(0, 180)
          : null
      }
    />
  );
}

async function loadWorkspace(
  userId: string,
  requested: string | string[] | undefined,
) {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: { restaurant: true },
      orderBy: { createdAt: "asc" },
    });
    if (!memberships.length) return { empty: true as const };
    const selected =
      typeof requested === "string"
        ? memberships.find((m) => m.restaurantId === requested)
        : memberships[0];
    if (!selected)
      return { error: "This account doesn't have access to that restaurant." };
    const restaurant = selected.restaurant;
    const conversation =
      (await prisma.conversation.findFirst({
        where: { restaurantId: restaurant.id, title: "KOB Talk" },
        orderBy: { updatedAt: "desc" },
      })) ??
      (await prisma.conversation.create({
        data: { restaurantId: restaurant.id, title: "KOB Talk" },
      }));
    const [history, connectors] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      listTalkConnectors(restaurant.id),
    ]);
    const messages: TalkMessage[] = history.reverse().map((message) => {
      const extra = (message.toolCalls ?? {}) as Partial<TalkMessage>;
      return {
        id: message.id,
        role: message.role === "USER" ? "user" : "assistant",
        text: message.content,
        sources: extra.sources ?? [],
        activity: extra.activity ?? [],
        needsConnection: extra.needsConnection ?? [],
      };
    });
    return {
      restaurant: { id: restaurant.id, name: restaurant.name },
      restaurants: memberships.map((m) => ({
        id: m.restaurant.id,
        name: m.restaurant.name,
      })),
      conversationId: conversation.id,
      initialMessages: messages,
      initialConnectors: connectors,
    };
  } catch {
    return {
      error:
        "Your workspace could not load. Please retry; your conversation has not been replaced with sample data.",
    };
  }
}
