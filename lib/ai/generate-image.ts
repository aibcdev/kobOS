import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  geminiConfigError,
  getGeminiImageModelName,
  isGeminiConfigured,
} from "@/lib/ai/gemini-config";

export type GenerateImageResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Generate a square restaurant image with Gemini.
 * Returns a data URL suitable for img src.
 */
export async function generateImage(prompt: string): Promise<GenerateImageResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, error: `${geminiConfigError()} — cannot generate images.` };
  }

  const safePrompt = [
    "High-quality restaurant food photography or atmospheric dining scene.",
    prompt.slice(0, 800),
    "Professional, appetising, warm lighting. No text, no words, no logos.",
  ].join(" ");

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
    const model = genAI.getGenerativeModel({ model: getGeminiImageModelName() });
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: safePrompt }] }],
      generationConfig: {
        // @ts-expect-error Gemini image output modality
        responseModalities: ["IMAGE"],
      },
    });

    const parts = res.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      return { ok: false, error: "No image returned from Gemini." };
    }

    const mime = imagePart.inlineData.mimeType ?? "image/png";
    return { ok: true, url: `data:${mime};base64,${imagePart.inlineData.data}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";
    return { ok: false, error: msg };
  }
}
