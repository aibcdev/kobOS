import { NextResponse } from "next/server";
import { geminiTextCompletion, getGeminiModelName, isGeminiConfigured } from "@/lib/ai/gemini-config";

/** Safe Gemini check — tests a tiny live call when configured. */
export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim() ?? "";
  const model = getGeminiModelName();
  const configured = isGeminiConfigured();
  const keyLooksLikeAiStudio = key.startsWith("AIza");

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      model,
      keyLooksLikeAiStudio,
      error: "GEMINI_API_KEY missing on this server (set in Netlify for trykob.com).",
    });
  }

  const probe = await geminiTextCompletion({
    system: "Reply with exactly: ok",
    user: "ping",
    maxOutputTokens: 8,
    temperature: 0,
  });

  return NextResponse.json({
    ok: probe.ok,
    configured: true,
    model,
    keyLooksLikeAiStudio,
    keyPrefix: key.slice(0, 6),
    probe: probe.ok ? "ok" : probe.error,
  });
}
