import { generateImage } from "@/lib/ai/generate-image";
import { geminiJsonCompletion } from "@/lib/ai/gemini-config";
import { scrapeBrandSignals } from "@/lib/creative-agent/scrape-brand";
import {
  buildCreativeBrandBriefUserMessage,
  buildCreativeShotPlanUserMessage,
  CREATIVE_BRAND_BRIEF_SYSTEM,
  CREATIVE_SHOT_PLAN_SYSTEM,
  type CreativeBrandBrief,
  type CreativeShotPlan,
} from "@/lib/prompts/creative-agent/brand-brief";
import { uploadWorkspaceFile } from "@/lib/workspace/upload-file";
import { ContentStatus, ContentType, CreativePackStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function packSize(isPreview: boolean): number {
  if (isPreview) return Math.min(3, Number(process.env.CREATIVE_PACK_PREVIEW_SIZE?.trim() || "3") || 3);
  return Math.min(16, Math.max(4, Number(process.env.CREATIVE_PACK_SIZE?.trim() || "12") || 12));
}

function parseBrief(raw: string): CreativeBrandBrief | null {
  try {
    const j = JSON.parse(raw) as CreativeBrandBrief;
    if (!j || typeof j !== "object") return null;
    return {
      tagline: String(j.tagline ?? ""),
      voice: String(j.voice ?? ""),
      palette: Array.isArray(j.palette) ? j.palette.map(String).slice(0, 5) : [],
      visualStyle: String(j.visualStyle ?? ""),
      audience: String(j.audience ?? ""),
      heroDishes: Array.isArray(j.heroDishes) ? j.heroDishes.map(String).slice(0, 8) : [],
      ugcHooks: Array.isArray(j.ugcHooks) ? j.ugcHooks.map(String).slice(0, 8) : [],
      doNots: Array.isArray(j.doNots) ? j.doNots.map(String).slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

function parseShots(raw: string, count: number): CreativeShotPlan[] {
  try {
    const j = JSON.parse(raw) as { shots?: CreativeShotPlan[] };
    const shots = Array.isArray(j.shots) ? j.shots : [];
    return shots
      .filter((s) => s && (s.kind === "ugc" || s.kind === "dish") && s.imagePrompt && s.caption)
      .slice(0, count)
      .map((s) => ({
        kind: s.kind,
        title: String(s.title || s.kind).slice(0, 80),
        imagePrompt: String(s.imagePrompt).slice(0, 900),
        caption: String(s.caption).slice(0, 500),
      }));
  } catch {
    return [];
  }
}

function fallbackShots(name: string, cuisine: string, count: number): CreativeShotPlan[] {
  const dishes = ["signature plate", "starter", "main", "dessert", "drink", "sharing board"];
  const out: CreativeShotPlan[] = [];
  for (let i = 0; i < count; i++) {
    const dish = dishes[i % dishes.length]!;
    const ugc = i % 2 === 0;
    out.push({
      kind: ugc ? "ugc" : "dish",
      title: ugc ? `UGC · ${dish}` : `Dish · ${dish}`,
      imagePrompt: ugc
        ? `Handheld UGC-style photo of guests enjoying ${dish} at ${name}, ${cuisine} restaurant, natural phone camera, warm evening light, candid, appetising, no text`
        : `Professional food photography of ${dish} at ${name}, ${cuisine}, plated hero shot, shallow depth of field, warm lighting, no text`,
      caption: ugc
        ? `This is your sign to book ${name}. Fresh ${cuisine} — made to share.`
        : `Meet our ${dish}. Crafted for tonight at ${name}.`,
    });
  }
  return out;
}

async function uploadDataUrlImage(
  restaurantId: string,
  dataUrl: string,
  filename: string,
): Promise<string | null> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] || "image/png";
  const buffer = Buffer.from(match[2]!, "base64");
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  const result = await uploadWorkspaceFile({
    restaurantId,
    buffer,
    filename: `${filename}.${ext}`,
    mimeType: mime,
    assetType: "FOOD_PHOTO",
  });
  return result.ok ? result.url : null;
}

export type RunCreativePackResult =
  | { ok: true; packId: string; status: CreativePackStatus; doneCount: number }
  | { ok: false; error: string; packId?: string };

export async function runCreativePack(
  restaurantId: string,
  options?: { packId?: string; preview?: boolean; dishHints?: string[] },
): Promise<RunCreativePackResult> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

  const isPreview = Boolean(options?.preview);
  const targetCount = packSize(isPreview);

  let packId = options?.packId;
  if (!packId) {
    const pack = await prisma.creativePack.create({
      data: {
        restaurantId,
        status: CreativePackStatus.PENDING,
        targetCount,
      },
    });
    packId = pack.id;
  }

  await prisma.creativePack.update({
    where: { id: packId },
    data: { status: CreativePackStatus.RUNNING, targetCount, errorMessage: null },
  });

  try {
    const websiteSnippet = await scrapeBrandSignals(restaurant.website);
    const briefResult = await geminiJsonCompletion({
      system: CREATIVE_BRAND_BRIEF_SYSTEM,
      user: buildCreativeBrandBriefUserMessage({
        restaurantName: restaurant.name,
        cuisine: restaurant.cuisineType ?? "",
        city: restaurant.city ?? "",
        vibe: restaurant.vibe ?? "",
        websiteSnippet,
        dishHints: options?.dishHints ?? [],
      }),
      temperature: 0.55,
    });

    let brief: CreativeBrandBrief =
      briefResult.ok && parseBrief(briefResult.raw)
        ? parseBrief(briefResult.raw)!
        : {
            tagline: `${restaurant.name} — local favourite`,
            voice: "Warm, confident, hospitality-forward",
            palette: ["#094413", "#f9f3ed", "#2c2c2c"],
            visualStyle: "Warm food photography, candid guest moments",
            audience: "Local diners looking for a reliable night out",
            heroDishes: options?.dishHints?.length
              ? options.dishHints.slice(0, 4)
              : ["signature dish", "seasonal special", "sharing plate", "dessert"],
            ugcHooks: ["Book tonight", "Come hungry", "Your new regular"],
            doNots: ["No stock-photo vibes", "No heavy text overlays"],
          };

    await prisma.generatedContent.create({
      data: {
        restaurantId,
        creativePackId: packId,
        type: ContentType.CREATIVE_BRAND_BRIEF,
        prompt: "creative-agent brand brief",
        output: JSON.stringify(brief, null, 2),
        status: ContentStatus.READY,
      },
    });

    await prisma.creativePack.update({
      where: { id: packId },
      data: { brief: brief as unknown as Prisma.InputJsonValue },
    });

    const planResult = await geminiJsonCompletion({
      system: CREATIVE_SHOT_PLAN_SYSTEM,
      user: buildCreativeShotPlanUserMessage({
        restaurantName: restaurant.name,
        cuisine: restaurant.cuisineType ?? "",
        city: restaurant.city ?? "",
        brief,
        count: targetCount,
      }),
      temperature: 0.7,
    });

    const shots =
      planResult.ok && parseShots(planResult.raw, targetCount).length
        ? parseShots(planResult.raw, targetCount)
        : fallbackShots(restaurant.name, restaurant.cuisineType ?? "restaurant", targetCount);

    let doneCount = 0;
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]!;
      const contentType = shot.kind === "ugc" ? ContentType.CREATIVE_UGC : ContentType.CREATIVE_DISH;
      let imageUrl: string | null = null;

      const img = await generateImage(
        `${shot.imagePrompt}. Brand mood: ${brief.visualStyle}. Restaurant: ${restaurant.name}.`,
      );
      if (img.ok) {
        imageUrl =
          (await uploadDataUrlImage(restaurantId, img.url, `creative-${packId.slice(0, 8)}-${i}`)) ??
          img.url;
      }

      await prisma.generatedContent.create({
        data: {
          restaurantId,
          creativePackId: packId,
          type: contentType,
          prompt: shot.imagePrompt,
          output: shot.caption,
          imageUrl,
          status: imageUrl ? ContentStatus.READY : ContentStatus.DRAFT,
        },
      });
      doneCount++;
      await prisma.creativePack.update({
        where: { id: packId },
        data: { doneCount },
      });
    }

    await prisma.creativePack.update({
      where: { id: packId },
      data: { status: CreativePackStatus.COMPLETED, doneCount },
    });

    return { ok: true, packId, status: CreativePackStatus.COMPLETED, doneCount };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Creative pack failed";
    await prisma.creativePack.update({
      where: { id: packId },
      data: { status: CreativePackStatus.FAILED, errorMessage: msg },
    });
    return { ok: false, error: msg, packId };
  }
}

export async function countCreativePacksThisMonth(restaurantId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return prisma.creativePack.count({
    where: {
      restaurantId,
      createdAt: { gte: start },
      status: { in: [CreativePackStatus.COMPLETED, CreativePackStatus.RUNNING, CreativePackStatus.PENDING] },
    },
  });
}
