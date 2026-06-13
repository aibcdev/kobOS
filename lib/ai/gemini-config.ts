import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LanguageModel } from "ai";

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(trimEnv("GEMINI_API_KEY"));
}

export function geminiConfigError(): string {
  return "GEMINI_API_KEY is not configured.";
}

export function getGeminiModelName(): string {
  return trimEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";
}

export function getGeminiImageModelName(): string {
  return trimEnv("GEMINI_IMAGE_MODEL") ?? "gemini-2.0-flash-preview-image-generation";
}

function getGeminiApiKey(): string | undefined {
  return trimEnv("GEMINI_API_KEY");
}

/** AI SDK model for streaming chat (Chief of Staff). */
export function getChatLanguageModel(): LanguageModel {
  const provider = createGoogleGenerativeAI({
    apiKey: getGeminiApiKey(),
  });
  return provider(getGeminiModelName());
}

export async function geminiJsonCompletion(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { ok: false, error: geminiConfigError() };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: {
        temperature: args.temperature ?? 0.65,
        responseMimeType: "application/json",
      },
    });

    const prompt = `${args.system}\n\n${args.user}`;
    const res = await model.generateContent(prompt);
    const raw = res.response.text()?.trim();
    if (!raw) {
      return { ok: false, error: "Empty Gemini response" };
    }
    return { ok: true, raw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini request failed";
    return { ok: false, error: msg };
  }
}

export async function geminiTextCompletion(args: {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { ok: false, error: geminiConfigError() };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: {
        temperature: args.temperature ?? 0.7,
        maxOutputTokens: args.maxOutputTokens ?? 512,
      },
    });

    const prompt = `${args.system}\n\n${args.user}`;
    const res = await model.generateContent(prompt);
    const text = res.response.text()?.trim();
    if (!text) {
      return { ok: false, error: "Empty Gemini response" };
    }
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini request failed";
    return { ok: false, error: msg };
  }
}
