import { geminiJsonCompletion } from "@/lib/growth-agent/gemini-json-completion";
import { parseJsonWithSchema } from "@/lib/growth-agent/openai-json-completion";
import {
  AI_ERA_ARTICLE_SYSTEM,
  AI_ERA_BRIEF_SYSTEM,
} from "@/lib/prompts/seo/ai-era-content-brief";
import type {
  AiEraArticleResult,
  AiEraBriefResult,
  AiEraContentBrief,
} from "@/lib/seo/ai-era-brief-types";
import { isReadyToPublish, runPrePublishChecks } from "@/lib/seo/validate-ai-era-content";
import { z } from "zod";

const briefSchema = z.object({
  keyword: z.string(),
  coreQuestion: z.string(),
  aeoBlock: z.string(),
  h2Map: z.array(z.string()).min(3).max(8),
  reader: z.string(),
  edge: z.string(),
  edgeType: z.enum(["original_data", "icp_specific", "named_framework", "deeper_subtopic"]),
  cta: z.string(),
  eeatSignal: z.string(),
});

const articleSchema = z.object({
  articleMarkdown: z.string().min(200),
});

export type GenerateAiEraInput = {
  keyword: string;
  restaurantName: string;
  city?: string | null;
  cuisineType?: string | null;
  edgeHint?: string;
};

function buildUserPrompt(input: GenerateAiEraInput): string {
  return [
    `Keyword: ${input.keyword}`,
    `Restaurant: ${input.restaurantName}`,
    input.city ? `City: ${input.city}` : null,
    input.cuisineType ? `Cuisine: ${input.cuisineType}` : null,
    input.edgeHint?.trim() ? `Edge hint (use if strong): ${input.edgeHint.trim()}` : null,
    "",
    "Infer likely Google 'People Also Ask' questions for this keyword in this city.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateAiEraBrief(
  input: GenerateAiEraInput,
): Promise<{ ok: true; result: AiEraBriefResult } | { ok: false; error: string }> {
  const completion = await geminiJsonCompletion({
    system: AI_ERA_BRIEF_SYSTEM,
    user: buildUserPrompt(input),
    temperature: 0.55,
  });

  if (!completion.ok) return completion;

  const parsed = parseJsonWithSchema(completion.raw, briefSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const brief: AiEraContentBrief = { ...parsed.data, keyword: input.keyword };
  const prePublishChecks = runPrePublishChecks(brief);

  return {
    ok: true,
    result: {
      brief,
      prePublishChecks,
      readyToPublish: isReadyToPublish(prePublishChecks),
    },
  };
}

export async function generateAiEraArticle(
  input: GenerateAiEraInput,
): Promise<{ ok: true; result: AiEraArticleResult } | { ok: false; error: string }> {
  const briefResult = await generateAiEraBrief(input);
  if (!briefResult.ok) return briefResult;

  const { brief } = briefResult.result;

  const completion = await geminiJsonCompletion({
    system: AI_ERA_ARTICLE_SYSTEM,
    user: `Write the article from this brief:\n${JSON.stringify(brief, null, 2)}`,
    temperature: 0.6,
  });

  if (!completion.ok) return completion;

  const parsed = parseJsonWithSchema(completion.raw, articleSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const prePublishChecks = runPrePublishChecks(brief, parsed.data.articleMarkdown);

  return {
    ok: true,
    result: {
      brief,
      articleMarkdown: parsed.data.articleMarkdown,
      prePublishChecks,
      readyToPublish: isReadyToPublish(prePublishChecks),
    },
  };
}
