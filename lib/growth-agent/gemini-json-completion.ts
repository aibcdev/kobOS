import { GoogleGenerativeAI } from "@google/generative-ai";

export async function geminiJsonCompletion(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
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
