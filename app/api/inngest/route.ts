import { serve } from "inngest/next";
import type { NextRequest } from "next/server";
import { inngest } from "@/inngest/client";

type InngestHandlers = ReturnType<typeof serve>;

let handlersPromise: Promise<InngestHandlers> | null = null;

function loadHandlers(): Promise<InngestHandlers> {
  if (!handlersPromise) {
    handlersPromise = import("@/inngest/functions").then(({ functions }) =>
      serve({ client: inngest, functions }),
    );
  }
  return handlersPromise;
}

export async function GET(request: NextRequest, context: unknown) {
  const handlers = await loadHandlers();
  return handlers.GET(request, context);
}

export async function POST(request: NextRequest, context: unknown) {
  const handlers = await loadHandlers();
  return handlers.POST(request, context);
}

export async function PUT(request: NextRequest, context: unknown) {
  const handlers = await loadHandlers();
  return handlers.PUT(request, context);
}
