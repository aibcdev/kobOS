import { serve } from "inngest/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

type InngestHandlers = ReturnType<typeof serve>;

let handlersPromise: Promise<InngestHandlers> | null = null;

function loadHandlers(): Promise<InngestHandlers> {
  if (!handlersPromise) {
    handlersPromise = (async () => {
      const signingKey = process.env.INNGEST_SIGNING_KEY?.trim() || undefined;
      const signingKeyFallback = process.env.INNGEST_SIGNING_KEY_FALLBACK?.trim() || undefined;

      if (process.env.NODE_ENV === "production" && process.env.INNGEST_DEV !== "1" && !signingKey) {
        throw new Error(
          "INNGEST_SIGNING_KEY missing at runtime (cloud mode). Set it in Netlify Production and redeploy.",
        );
      }

      const { functions } = await import("@/inngest/functions");
      if (!Array.isArray(functions) || functions.length === 0) {
        throw new Error("inngest/functions export is empty or missing");
      }

      return serve({
        client: inngest,
        functions,
        // Explicit pass — Netlify sometimes fails silent env pickup for serve introspect
        ...(signingKey ? { signingKey } : {}),
        ...(signingKeyFallback ? { signingKeyFallback } : {}),
      } as Parameters<typeof serve>[0]);
    })().catch((err) => {
      handlersPromise = null;
      throw err;
    });
  }
  return handlersPromise;
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api/inngest]", message);
  return NextResponse.json(
    {
      code: "inngest_serve_error",
      error: message,
      hasSigningKey: Boolean(process.env.INNGEST_SIGNING_KEY?.trim()),
      hasEventKey: Boolean(process.env.INNGEST_EVENT_KEY?.trim()),
      inngestDev: process.env.INNGEST_DEV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest, context: unknown) {
  try {
    const handlers = await loadHandlers();
    return handlers.GET(request, context);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest, context: unknown) {
  try {
    const handlers = await loadHandlers();
    return handlers.POST(request, context);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: NextRequest, context: unknown) {
  try {
    const handlers = await loadHandlers();
    return handlers.PUT(request, context);
  } catch (err) {
    return errorResponse(err);
  }
}
